import { CHANGELOG, changelogFor, LATEST_CHANGELOG_VERSION, shouldShowWhatsNew } from "../constants/changelog";

describe("CHANGELOG", () => {
  it("is ordered newest first with unique versions", () => {
    const versions = CHANGELOG.map((e) => e.version);
    expect(new Set(versions).size).toBe(versions.length);
    const asTuple = (v: string) => v.split(".").map(Number);
    for (let i = 1; i < versions.length; i++) {
      const [a, b] = [asTuple(versions[i - 1]), asTuple(versions[i])];
      const newerFirst = a[0] > b[0] || (a[0] === b[0] && (a[1] > b[1] || (a[1] === b[1] && a[2] > b[2])));
      expect(newerFirst).toBe(true);
    }
    expect(LATEST_CHANGELOG_VERSION).toBe(versions[0]);
  });

  it("has at least one highlight per entry", () => {
    for (const e of CHANGELOG) expect(e.highlights.length).toBeGreaterThan(0);
  });
});

describe("shouldShowWhatsNew", () => {
  const v = LATEST_CHANGELOG_VERSION;

  it("fires once for an existing install upgrading (lastSeenVersion null)", () => {
    expect(shouldShowWhatsNew({ onboardingCompleted: true, lastSeenVersion: null }, v)).toBe(true);
  });

  it("fires when the last acknowledged version is older", () => {
    expect(shouldShowWhatsNew({ onboardingCompleted: true, lastSeenVersion: "2.3.0" }, v)).toBe(true);
  });

  it("never fires on a fresh install still in onboarding", () => {
    expect(shouldShowWhatsNew({ onboardingCompleted: false, lastSeenVersion: null }, v)).toBe(false);
  });

  it("does not fire again once acknowledged", () => {
    expect(shouldShowWhatsNew({ onboardingCompleted: true, lastSeenVersion: v }, v)).toBe(false);
  });

  it("does not fire for a version with no changelog entry", () => {
    expect(shouldShowWhatsNew({ onboardingCompleted: true, lastSeenVersion: null }, "99.0.0")).toBe(false);
    expect(changelogFor("99.0.0")).toBeUndefined();
  });
});
