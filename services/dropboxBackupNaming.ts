import { toLocalDateString } from "./period";

// Split out from services/dropbox.ts specifically so this pure filename
// logic can be unit-tested without pulling in expo-auth-session/
// expo-secure-store/expo-web-browser/expo-sqlite — none of those load in
// the Jest/Node test environment (no native module bridge), and ES
// modules evaluate a file's entire import chain the moment anything is
// imported from it.

export interface BackupEntry {
  path: string;
  kind: "auto" | "manual";
  label: string;
  timestampMs: number;
}

export function backupFilename(kind: "auto" | "manual", now: Date): string {
  if (kind === "auto") return `backup-auto-${toLocalDateString(now)}.db`;
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join("");
  return `backup-manual-${toLocalDateString(now)}T${time}.db`;
}

const AUTO_NAME_RE = /^\/?backup-auto-(\d{4})-(\d{2})-(\d{2})\.db$/;
const MANUAL_NAME_RE = /^\/?backup-manual-(\d{4})-(\d{2})-(\d{2})T(\d{2})(\d{2})(\d{2})\.db$/;

export function parseBackupEntry(name: string): BackupEntry | null {
  const auto = name.match(AUTO_NAME_RE);
  if (auto) {
    const date = new Date(Number(auto[1]), Number(auto[2]) - 1, Number(auto[3]));
    return {
      path: `/${name.replace(/^\//, "")}`,
      kind: "auto",
      timestampMs: date.getTime(),
      label: `Automatic — ${date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`,
    };
  }
  const manual = name.match(MANUAL_NAME_RE);
  if (manual) {
    const date = new Date(
      Number(manual[1]),
      Number(manual[2]) - 1,
      Number(manual[3]),
      Number(manual[4]),
      Number(manual[5]),
      Number(manual[6]),
    );
    return {
      path: `/${name.replace(/^\//, "")}`,
      kind: "manual",
      timestampMs: date.getTime(),
      label: `Manual — ${date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`,
    };
  }
  return null;
}
