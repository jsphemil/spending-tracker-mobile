import { buildFeedbackMailto, FEEDBACK_ADDRESS } from "../services/feedback";

const ctx = { appVersion: "3.0.0", buildNumber: "17", os: "android", osVersion: "16" };

describe("buildFeedbackMailto", () => {
  it("addresses the published support mailbox", () => {
    expect(buildFeedbackMailto(ctx).startsWith(`mailto:${FEEDBACK_ADDRESS}?`)).toBe(true);
  });

  it("prefills the subject with version and build", () => {
    const url = new URL(buildFeedbackMailto(ctx));
    expect(url.searchParams.get("subject")).toBe("Erebor feedback — v3.0.0 (17)");
  });

  it("carries only app and device context in the body", () => {
    const body = new URL(buildFeedbackMailto(ctx)).searchParams.get("body") ?? "";
    expect(body).toContain("App: Erebor Wealth Management 3.0.0 (build 17)");
    expect(body).toContain("Device: android 16");
    // The prompt line comes first so the cursor lands on it.
    expect(body.startsWith("What happened")).toBe(true);
  });

  it("encodes characters that would break the URL", () => {
    const url = buildFeedbackMailto({ ...ctx, osVersion: "16 & up" });
    expect(url).not.toContain(" & ");
    expect(new URL(url).searchParams.get("body")).toContain("16 & up");
  });
});
