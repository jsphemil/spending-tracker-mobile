import { HINT_IDS, HINTS, parseHintsSeen, serializeHintsSeen } from "../constants/hints";

describe("parseHintsSeen", () => {
  it("treats null, empty and garbage as nothing seen", () => {
    expect(parseHintsSeen(null)).toEqual([]);
    expect(parseHintsSeen(undefined)).toEqual([]);
    expect(parseHintsSeen("")).toEqual([]);
    expect(parseHintsSeen("not json")).toEqual([]);
    expect(parseHintsSeen('{"a":1}')).toEqual([]);
  });

  it("keeps known ids and drops unknown ones (a hint removed in a later version)", () => {
    expect(parseHintsSeen('["dashboard","retired-screen",42,"funds"]')).toEqual(["dashboard", "funds"]);
  });

  it("round-trips through serializeHintsSeen without duplicates", () => {
    const raw = serializeHintsSeen(["accounts", "accounts", "analytics"]);
    expect(parseHintsSeen(raw)).toEqual(["accounts", "analytics"]);
  });

  it("has copy for every id", () => {
    for (const id of HINT_IDS) {
      expect(HINTS[id].title.length).toBeGreaterThan(0);
      expect(HINTS[id].body.length).toBeGreaterThan(0);
    }
  });
});
