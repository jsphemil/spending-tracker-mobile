import { financialYear, toLocalDateString } from "../services/period";

const d = (s: string) => {
  const [y, m, day] = s.split("-").map(Number);
  return new Date(y, m - 1, day);
};
const show = (r: { start: Date; end: Date; label: string }) => [toLocalDateString(r.start), toLocalDateString(r.end), r.label];

describe("financialYear", () => {
  it("April start (India): mid-November is in FY 2026–27", () => {
    expect(show(financialYear(d("2026-11-12"), 4))).toEqual(["2026-04-01", "2027-04-01", "FY 2026–27"]);
  });
  it("April start: March still belongs to the year that began the previous April", () => {
    expect(show(financialYear(d("2027-03-31"), 4))).toEqual(["2026-04-01", "2027-04-01", "FY 2026–27"]);
    expect(show(financialYear(d("2027-04-01"), 4))).toEqual(["2027-04-01", "2028-04-01", "FY 2027–28"]);
  });
  it("offset -1 gives the previous FY", () => {
    expect(show(financialYear(d("2026-11-12"), 4, -1))).toEqual(["2025-04-01", "2026-04-01", "FY 2025–26"]);
  });
  it("January start is the calendar year", () => {
    expect(show(financialYear(d("2026-11-12"), 1))).toEqual(["2026-01-01", "2027-01-01", "FY 2026"]);
  });
  it("century rollover pads the short year", () => {
    expect(financialYear(d("2099-06-01"), 4).label).toBe("FY 2099–00");
  });
});
