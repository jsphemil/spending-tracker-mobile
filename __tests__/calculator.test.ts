import { evaluateExpression } from "../services/calculator";

describe("evaluateExpression", () => {
  it("evaluates a plain number", () => {
    expect(evaluateExpression("42")).toBe(42);
    expect(evaluateExpression("42.5")).toBe(42.5);
  });

  it("evaluates the four basic operators", () => {
    expect(evaluateExpression("1+2")).toBe(3);
    expect(evaluateExpression("3-2")).toBe(1);
    expect(evaluateExpression("4*5")).toBe(20);
    expect(evaluateExpression("9/9")).toBe(1);
  });

  it("respects operator precedence and parentheses", () => {
    expect(evaluateExpression("2+3*4")).toBe(14);
    expect(evaluateExpression("(2+3)*4")).toBe(20);
    expect(evaluateExpression("10-2*3")).toBe(4);
  });

  it("handles unary minus", () => {
    expect(evaluateExpression("-5+10")).toBe(5);
    expect(evaluateExpression("5*-2")).toBe(-10);
  });

  it("returns null for empty or garbage input", () => {
    expect(evaluateExpression("")).toBeNull();
    expect(evaluateExpression("   ")).toBeNull();
    expect(evaluateExpression("abc")).toBeNull();
    expect(evaluateExpression("1+")).toBeNull();
    expect(evaluateExpression("1//2")).toBeNull();
    expect(evaluateExpression("(1+2")).toBeNull();
  });

  it("never executes arbitrary code even if it looks JS-like", () => {
    // Non-arithmetic characters fail the allowlist regex before parsing.
    expect(evaluateExpression("alert(1)")).toBeNull();
    expect(evaluateExpression("1; console.log(1)")).toBeNull();
  });
});
