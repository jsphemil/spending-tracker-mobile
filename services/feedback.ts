// In-app feedback (spec.md §5.22). The app has no server, so feedback is a
// hand-off to the user's own mail app via a mailto: URL — the same address
// the privacy policy publishes. The body carries only what a bug report
// needs to be reproducible (app version, build, OS); never any financial
// data. Kept free of React Native imports so it unit-tests under node.

export const FEEDBACK_ADDRESS = "meliordevelopments@gmail.com";

export interface FeedbackContext {
  appVersion: string;
  buildNumber: string;
  os: string;
  osVersion: string;
}

export function buildFeedbackMailto(ctx: FeedbackContext): string {
  const subject = `Erebor feedback — v${ctx.appVersion} (${ctx.buildNumber})`;
  const body = [
    "What happened, or what would you like to see?",
    "",
    "",
    "---",
    `App: Erebor Wealth Management ${ctx.appVersion} (build ${ctx.buildNumber})`,
    `Device: ${ctx.os} ${ctx.osVersion}`,
  ].join("\n");
  return `mailto:${FEEDBACK_ADDRESS}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
