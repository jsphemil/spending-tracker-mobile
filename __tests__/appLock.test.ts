// expo-local-authentication is a native module that can't load under node;
// only the pure re-lock decision is under test here.
jest.mock("expo-local-authentication", () => ({}));

import { RELOCK_GRACE_MS, shouldRelock } from "../services/appLock";

const T0 = 1_000_000;

describe("shouldRelock", () => {
  it("never re-locks when the lock is disabled", () => {
    expect(
      shouldRelock(
        { enabled: false, previous: "background", next: "active", backgroundedAt: T0 },
        T0 + RELOCK_GRACE_MS * 10,
      ),
    ).toBe(false);
  });

  it("re-locks on return to the foreground after the grace period", () => {
    expect(
      shouldRelock(
        { enabled: true, previous: "background", next: "active", backgroundedAt: T0 },
        T0 + RELOCK_GRACE_MS,
      ),
    ).toBe(true);
  });

  it("does not re-lock on a quick switch away and back (sending feedback by email)", () => {
    expect(
      shouldRelock(
        { enabled: true, previous: "background", next: "active", backgroundedAt: T0 },
        T0 + RELOCK_GRACE_MS - 1,
      ),
    ).toBe(false);
  });

  it("only decides on the transition into active", () => {
    expect(
      shouldRelock(
        { enabled: true, previous: "active", next: "background", backgroundedAt: T0 },
        T0 + RELOCK_GRACE_MS * 2,
      ),
    ).toBe(false);
    expect(
      shouldRelock(
        { enabled: true, previous: "active", next: "active", backgroundedAt: T0 },
        T0 + RELOCK_GRACE_MS * 2,
      ),
    ).toBe(false);
  });

  it("ignores an active event with no recorded departure", () => {
    expect(
      shouldRelock(
        { enabled: true, previous: "background", next: "active", backgroundedAt: null },
        T0 + RELOCK_GRACE_MS * 2,
      ),
    ).toBe(false);
  });
});
