import {
  CARD_IDS,
  DEFAULT_LAYOUT,
  isDefaultLayout,
  parseDashboardLayout,
  sanitizeDashboardLayout,
  serializeDashboardLayout,
} from "../constants/dashboardCards";

describe("parseDashboardLayout", () => {
  it("returns the default for null, empty and garbage", () => {
    expect(parseDashboardLayout(null)).toEqual(DEFAULT_LAYOUT);
    expect(parseDashboardLayout("")).toEqual(DEFAULT_LAYOUT);
    expect(parseDashboardLayout("nope")).toEqual(DEFAULT_LAYOUT);
    expect(parseDashboardLayout("[1,2]")).toEqual(DEFAULT_LAYOUT);
  });

  it("keeps a saved order and hidden set", () => {
    const raw = JSON.stringify({ order: ["netWorth", "attention", "month", "funds"], hidden: ["funds"] });
    expect(parseDashboardLayout(raw)).toEqual({
      order: ["netWorth", "attention", "month", "funds"],
      hidden: ["funds"],
    });
  });

  it("pins net worth first and never lets it be hidden", () => {
    const raw = JSON.stringify({ order: ["month", "netWorth"], hidden: ["netWorth", "month"] });
    const layout = parseDashboardLayout(raw);
    expect(layout.order[0]).toBe("netWorth");
    expect(layout.hidden).toEqual(["month"]);
  });

  it("drops unknown ids and appends cards missing from a saved order", () => {
    const raw = JSON.stringify({ order: ["netWorth", "retired", "attention"], hidden: ["retired"] });
    const layout = parseDashboardLayout(raw);
    expect(layout.order).toEqual(["netWorth", "attention", "month", "funds"]);
    expect(layout.hidden).toEqual([]);
    expect(new Set(layout.order).size).toBe(CARD_IDS.length);
  });

  // Layouts saved before V4 (§5.24) carry the retired shortcuts card and key.
  it("reads a pre-V4 layout, keeping its order and dropping shortcuts", () => {
    const raw = JSON.stringify({
      order: ["netWorth", "attention", "shortcuts", "month", "funds"],
      hidden: ["shortcuts", "funds"],
      shortcuts: ["/fund", "/tag"],
    });
    expect(parseDashboardLayout(raw)).toEqual({
      order: ["netWorth", "attention", "month", "funds"],
      hidden: ["funds"],
    });
  });

  it("round-trips through serialize", () => {
    const layout = sanitizeDashboardLayout({ order: ["netWorth", "funds"], hidden: ["attention"] });
    expect(parseDashboardLayout(serializeDashboardLayout(layout))).toEqual(layout);
  });

  it("recognises the default layout regardless of how it was reached", () => {
    expect(isDefaultLayout(DEFAULT_LAYOUT)).toBe(true);
    expect(isDefaultLayout(parseDashboardLayout(serializeDashboardLayout(DEFAULT_LAYOUT)))).toBe(true);
    expect(isDefaultLayout(sanitizeDashboardLayout({ ...DEFAULT_LAYOUT, hidden: ["funds"] }))).toBe(false);
  });
});
