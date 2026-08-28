import * as AuthSession from "expo-auth-session";
import { Directory, File, Paths } from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";

import { updateSettings } from "../db/actions/settings";
import { sqliteDb } from "../db/client";
import { backupFilename, parseBackupEntry, type BackupEntry } from "./dropboxBackupNaming";

export type { BackupEntry } from "./dropboxBackupNaming";
import { toLocalDateString } from "./period";

// Required once per app, before any AuthSession redirect can complete —
// see expo-auth-session's docs. Safe to call at module scope.
WebBrowser.maybeCompleteAuthSession();

const DROPBOX_APP_KEY = (Constants.expoConfig?.extra?.dropboxAppKey as string | undefined) ?? "";
const DROPBOX_AUTHORIZE_ENDPOINT = "https://www.dropbox.com/oauth2/authorize";
const DROPBOX_TOKEN_ENDPOINT = "https://api.dropboxapi.com/oauth2/token";
const DROPBOX_UPLOAD_ENDPOINT = "https://content.dropboxapi.com/2/files/upload";
const DROPBOX_DOWNLOAD_ENDPOINT = "https://content.dropboxapi.com/2/files/download";
const DROPBOX_LIST_FOLDER_ENDPOINT = "https://api.dropboxapi.com/2/files/list_folder";
const DROPBOX_ACCOUNT_ENDPOINT = "https://api.dropboxapi.com/2/users/get_current_account";

const SECURE_STORE_ACCESS_TOKEN = "dropbox_access_token";
const SECURE_STORE_REFRESH_TOKEN = "dropbox_refresh_token";
const SECURE_STORE_ACCESS_TOKEN_EXPIRY = "dropbox_access_token_expiry";

// This app requests App-folder-only Dropbox access (spec.md §3 — backups
// go to a sandboxed folder in the user's own Dropbox, never full access),
// so `path: ""` in list_folder and a bare `/filename` in upload/download
// already resolve relative to that sandbox root, not the user's real
// Dropbox root.
const DB_FILENAME = "spending-tracker.db";

function redirectUri(): string {
  return AuthSession.makeRedirectUri({ scheme: "spendingtracker", path: "dropbox-auth" });
}

async function storeTokens(accessToken: string, refreshToken: string | null, expiresInSeconds: number) {
  await SecureStore.setItemAsync(SECURE_STORE_ACCESS_TOKEN, accessToken);
  if (refreshToken) await SecureStore.setItemAsync(SECURE_STORE_REFRESH_TOKEN, refreshToken);
  await SecureStore.setItemAsync(
    SECURE_STORE_ACCESS_TOKEN_EXPIRY,
    String(Date.now() + expiresInSeconds * 1000),
  );
}

export async function isDropboxConnected(): Promise<boolean> {
  return (await SecureStore.getItemAsync(SECURE_STORE_REFRESH_TOKEN)) !== null;
}

// Returns a currently-valid access token, refreshing it first if expired
// (or about to expire within a minute). Throws if never connected.
async function getValidAccessToken(): Promise<string> {
  const expiryRaw = await SecureStore.getItemAsync(SECURE_STORE_ACCESS_TOKEN_EXPIRY);
  const expiry = expiryRaw ? Number(expiryRaw) : 0;
  if (Date.now() < expiry - 60_000) {
    const cached = await SecureStore.getItemAsync(SECURE_STORE_ACCESS_TOKEN);
    if (cached) return cached;
  }

  const refreshToken = await SecureStore.getItemAsync(SECURE_STORE_REFRESH_TOKEN);
  if (!refreshToken) throw new Error("Not connected to Dropbox");

  const res = await fetch(DROPBOX_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: DROPBOX_APP_KEY,
    }).toString(),
  });
  if (!res.ok) throw new Error(`Dropbox token refresh failed (${res.status})`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  await storeTokens(data.access_token, refreshToken, data.expires_in);
  return data.access_token;
}

// Runs the full PKCE OAuth flow (opens Dropbox's own login/consent page),
// stores the resulting tokens in expo-secure-store (never in the app's
// own SQLite `settings` table, which isn't encrypted), and writes the
// connected account's email to `settings.dropboxAccountEmail` — that
// column doubles as the "connected" signal for the rest of the app.
export async function connectDropbox(settingsId: number): Promise<string> {
  if (!DROPBOX_APP_KEY) {
    throw new Error("Dropbox isn't configured yet (missing app key) — see app.json's extra.dropboxAppKey.");
  }

  const uri = redirectUri();
  const request = new AuthSession.AuthRequest({
    clientId: DROPBOX_APP_KEY,
    redirectUri: uri,
    usePKCE: true,
    responseType: AuthSession.ResponseType.Code,
    // Required to get a refresh token back, not just a short-lived access
    // token — automatic daily backups can't prompt the user to re-auth.
    extraParams: { token_access_type: "offline" },
  });
  const result = await request.promptAsync({ authorizationEndpoint: DROPBOX_AUTHORIZE_ENDPOINT });
  if (result.type === "cancel" || result.type === "dismiss") {
    throw new Error("Connection cancelled");
  }
  if (result.type !== "success" || !result.params.code) {
    throw new Error("Dropbox authorization failed");
  }

  const tokenResult = await AuthSession.exchangeCodeAsync(
    {
      clientId: DROPBOX_APP_KEY,
      code: result.params.code,
      redirectUri: uri,
      extraParams: { code_verifier: request.codeVerifier ?? "" },
    },
    { tokenEndpoint: DROPBOX_TOKEN_ENDPOINT },
  );
  await storeTokens(
    tokenResult.accessToken,
    tokenResult.refreshToken ?? null,
    tokenResult.expiresIn ?? 14400,
  );

  const accountRes = await fetch(DROPBOX_ACCOUNT_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenResult.accessToken}`, "Content-Type": "application/json" },
  });
  if (!accountRes.ok) throw new Error(`Couldn't read Dropbox account info (${accountRes.status})`);
  const account = (await accountRes.json()) as { email: string };
  updateSettings(settingsId, { dropboxAccountEmail: account.email });
  return account.email;
}

export async function disconnectDropbox(settingsId: number): Promise<void> {
  await SecureStore.deleteItemAsync(SECURE_STORE_ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(SECURE_STORE_REFRESH_TOKEN);
  await SecureStore.deleteItemAsync(SECURE_STORE_ACCESS_TOKEN_EXPIRY);
  updateSettings(settingsId, { dropboxAccountEmail: null, lastAutoBackupDate: null });
}

// A consistent, self-contained snapshot via SQLite's own VACUUM INTO —
// not a raw file copy (which could miss data still sitting in a -wal
// file under WAL journal mode) and not a JSON export (this stays
// byte-for-byte restorable by just swapping the live db file for it).
function vacuumSnapshot(): File {
  const dir = new Directory(Paths.cache);
  const file = new File(dir, `dropbox-backup-${Date.now()}.db`);
  if (file.exists) file.delete();
  // VACUUM INTO wants a plain filesystem path, not a file:// URI.
  const path = file.uri.replace(/^file:\/\//, "");
  sqliteDb.execSync(`VACUUM INTO '${path.replace(/'/g, "''")}'`);
  return file;
}

export async function backupNow(settingsId: number, kind: "auto" | "manual"): Promise<void> {
  const accessToken = await getValidAccessToken();
  const now = new Date();
  const snapshot = vacuumSnapshot();
  try {
    const res = await fetch(DROPBOX_UPLOAD_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({
          path: `/${backupFilename(kind, now)}`,
          mode: "overwrite",
          mute: true,
        }),
      },
      body: await snapshot.bytes(),
    });
    if (!res.ok) throw new Error(`Dropbox upload failed (${res.status})`);
  } finally {
    if (snapshot.exists) snapshot.delete();
  }
  if (kind === "auto") {
    updateSettings(settingsId, { lastAutoBackupDate: toLocalDateString(now) });
  }
}

// Only called from app/_layout.tsx's check-on-app-open gate — "automatic
// daily backup" realistically means this, not a true OS background task
// (unreliable on mobile, especially iOS; not worth a new dependency for
// an app the user opens regularly). Never throws — a failed silent
// background backup shouldn't surface an error the user didn't ask for;
// it just tries again next app open.
export async function runAutoBackupIfDue(settingsId: number, lastAutoBackupDate: string | null): Promise<void> {
  const today = toLocalDateString(new Date());
  if (lastAutoBackupDate === today) return;
  try {
    await backupNow(settingsId, "auto");
  } catch {
    // Silent by design — see comment above.
  }
}

export async function listBackups(): Promise<BackupEntry[]> {
  const accessToken = await getValidAccessToken();
  const res = await fetch(DROPBOX_LIST_FOLDER_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ path: "" }),
  });
  if (!res.ok) throw new Error(`Couldn't list Dropbox backups (${res.status})`);
  const data = (await res.json()) as { entries: Array<{ [".tag"]: string; name: string }> };
  return data.entries
    .filter((e) => e[".tag"] === "file")
    .map((e) => parseBackupEntry(e.name))
    .filter((e): e is BackupEntry => e !== null)
    .sort((a, b) => b.timestampMs - a.timestampMs);
}

// Downloads the selected backup and replaces the live database file with
// it, closing the current connection first. Deliberately does NOT try to
// re-open a fresh connection or hot-swap anything in place afterward —
// the caller is responsible for telling the user to close and reopen the
// app, the safest option given expo-sqlite's native connection can't be
// safely swapped out from under the running JS.
export async function restoreBackup(path: string): Promise<void> {
  const accessToken = await getValidAccessToken();
  const res = await fetch(DROPBOX_DOWNLOAD_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Dropbox-API-Arg": JSON.stringify({ path }),
    },
  });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const bytes = new Uint8Array(await res.arrayBuffer());

  sqliteDb.closeSync();
  const dbFile = new File(new Directory(Paths.document, "SQLite"), DB_FILENAME);
  dbFile.write(bytes);
}
