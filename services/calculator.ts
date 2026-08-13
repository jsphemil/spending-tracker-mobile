// Lets amount fields (transaction amount, opening balance) accept a
// typed-out arithmetic expression like "1+2*3-4/2", not just a plain
// number — a small hand-rolled recursive-descent parser, not eval(), so
// arbitrary text can never execute as code. Supports +, -, *, /, unary
// minus, and parentheses. Returns null for anything that doesn't parse
// cleanly to a finite number (including plain garbage input).
export function evaluateExpression(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!/^[0-9+\-*/().\s]+$/.test(trimmed)) return null;

  let pos = 0;
  const peek = () => trimmed[pos];
  const skipSpace = () => {
    while (peek() === " ") pos++;
  };

  function parseNumber(): number {
    skipSpace();
    const start = pos;
    while (pos < trimmed.length && /[0-9.]/.test(peek())) pos++;
    const numStr = trimmed.slice(start, pos);
    if (numStr === "" || numStr === ".") throw new Error("invalid number");
    const n = Number(numStr);
    if (Number.isNaN(n)) throw new Error("invalid number");
    return n;
  }

  function parseFactor(): number {
    skipSpace();
    if (peek() === "(") {
      pos++;
      const value = parseExpression();
      skipSpace();
      if (peek() !== ")") throw new Error("expected )");
      pos++;
      return value;
    }
    if (peek() === "-") {
      pos++;
      return -parseFactor();
    }
    if (peek() === "+") {
      pos++;
      return parseFactor();
    }
    return parseNumber();
  }

  function parseTerm(): number {
    let value = parseFactor();
    skipSpace();
    while (peek() === "*" || peek() === "/") {
      const op = peek();
      pos++;
      const rhs = parseFactor();
      value = op === "*" ? value * rhs : value / rhs;
      skipSpace();
    }
    return value;
  }

  function parseExpression(): number {
    let value = parseTerm();
    skipSpace();
    while (peek() === "+" || peek() === "-") {
      const op = peek();
      pos++;
      const rhs = parseTerm();
      value = op === "+" ? value + rhs : value - rhs;
      skipSpace();
    }
    return value;
  }

  try {
    const result = parseExpression();
    skipSpace();
    if (pos !== trimmed.length) return null; // trailing garbage
    return Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}
