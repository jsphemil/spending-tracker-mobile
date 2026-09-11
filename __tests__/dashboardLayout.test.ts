import {
  CARD_IDS,
  DEFAULT_LAYOUT,
  isDefaultLayout,
  parseDashboardLayout,
  sanitizeDashboardLayout,
  serializeDashboardLayout,
  SHORTCUT_HREFS,
} from "../constants/dashboardCards";

describe("parseDashboardLayout", () => {
  it("returns the default for null, empty and garbage", () => {
    expect(parseDashboardLayout(null)).toEqual(DEFAULT_LAYOUT);
    expect(parseDashboardLayout("")).toEqual(DEFAULT_LAYOUT);
    expect(parseDashboardLayout("nope")).toEqual(DEFAULT_LAYOUT);
    expect(parseDashboardLayout("[1,2]")).toEqual(DEFAULT_LAYOUT);
  });

  it("keeps a saved order and hidden set", () => {
    const raw = JSON.stringify({ order: ["netWorth", "attention", "month", "funds", "shortcuts"], hidden: ["funds"], shortcuts: ["/fund"] });
    expect(parseDashboardLayout(raw)).toEqual({
      order: ["netWorth", "attention", "month", "funds", "shortcuts"],
      hidden: ["funds"],
      shortcuts: ["/fund"],
    });
  });

  it("pins net worth first and never lets it be hidden", () => {
    const raw = JSON.stringify({ order: ["month", "netWorth"], hidden: ["netWorth", "month"], shortcuts: [] });
    const layout = parseDashboardLayout(raw);
    expect(layout.order[0]).toBe("netWorth");
    expect(layout.hidden).toEqual(["month"]);
  });

  it("drops unknown ids and appends cards missing from a saved order", () => {
    const raw = JSON.stringify({ order: ["netWorth", "retired", "month"], hidden: ["retired"], shortcuts: ["/nowhere", "/tag"] });
    const layout = parseDashboardLayout(raw);
    expect(layout.order).toEqual(["netWorth", "month", "funds", "attention", "shortcuts"]);
    expect(layout.hidden).toEqual([]);
    expect(layout.shortcuts).toEqual(["/tag"]);
    expect(new Set(layout.order).size).toBe(CARD_IDS.length);
  });

  it("treats a missing shortcuts key as all shortcuts, and an empty one as none", () => {
    expect(parseDashboardLayout(JSON.stringify({ order: [] })).shortcuts).toEqual([...SHORTCUT_HREFS]);
    expect(parseDashboardLayout(JSON.stringify({ order: [], shortcuts: [] })).shortcuts).toEqual([]);
  });

  it("round-trips through serialize", () => {
    const layout = sanitizeDashboardLayout({ order: ["netWorth", "shortcuts", "funds"], hidden: ["attention"], shortcuts: ["/calendar"] });
    expect(parseDashboardLayout(serializeDashboardLayout(layout))).toEqual(layout);
  });

  it("recognises the default layout regardless of how it was reached", () => {
    expect(isDefaultLayout(DEFAULT_LAYOUT)).toBe(true);
    expect(isDefaultLayout(parseDashboardLayout(serializeDashboardLayout(DEFAULT_LAYOUT)))).toBe(true);
    expect(isDefaultLayout(sanitizeDashboardLayout({ ...DEFAULT_LAYOUT, hidden: ["funds"] }))).toBe(false);
  });
});
