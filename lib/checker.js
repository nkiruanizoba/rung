// Deterministic answer checking. The AI never decides if an answer is right.
// Accepts whole numbers, decimals, fractions (5/8), mixed numbers (17 1/2),
// ratios (3:4, "3 to 4"), money ($0.25, 25 cents) and percents (75%).

import { frac, fromDecimalString, fromBank, eq, div, mul, toNumber } from "./fraction.js";

const NUM = String.raw`(\d+(?:\.\d+)?|\.\d+)`;
const TAIL = String.raw`(?:\s*([a-z¢%][a-z¢% ]*))?`;

const RE_RATIO = new RegExp(String.raw`^${NUM}\s*(?::|\bto\b|\bfor every\b)\s*${NUM}${TAIL}$`);
const RE_MIXED = new RegExp(String.raw`^(\d+)\s+(\d+)\s*/\s*(\d+)${TAIL}$`);
const RE_FRAC = new RegExp(String.raw`^${NUM}\s*/\s*${NUM}${TAIL}$`);
const RE_NUMBER = new RegExp(String.raw`^${NUM}${TAIL}$`);

const LEADING = /^(?:i think|i got|maybe|so|the answer is|my answer is|answer:?|it'?s|it is|is|about|=)\s*/;

function normalize(raw) {
  let s = String(raw ?? "").toLowerCase().trim();
  s = s.replace(/[−–—]/g, "-").replace(/\$/g, "").replace(/(\d),(\d{3})\b/g, "$1$2");
  s = s.replace(/[.!]+$/, "").trim();
  s = s.replace(/^[a-z]\s*=\s*/, "");
  let prev;
  do { prev = s; s = s.replace(LEADING, "").trim(); } while (s !== prev);
  return s;
}

function tailFlags(tail) {
  const t = (tail || "").trim();
  return {
    percent: /%|percent/.test(t),
    cents: /¢|\bcents?\b/.test(t) && !/percent/.test(t),
  };
}

function num(s) { return fromDecimalString(s); }

export function parseAnswer(raw) {
  const s = normalize(raw);
  if (!s) return { kind: "empty" };
  if (s.startsWith("-")) return { kind: "unparsed" };
  let m;
  if ((m = RE_RATIO.exec(s))) {
    return { kind: "ratio", a: num(m[1]), b: num(m[2]) };
  }
  if ((m = RE_MIXED.exec(s))) {
    const whole = parseInt(m[1], 10), n = parseInt(m[2], 10), d = parseInt(m[3], 10);
    if (d === 0) return { kind: "unparsed" };
    let value = frac(whole * d + n, d);
    const f = tailFlags(m[4]);
    if (f.cents) value = div(value, frac(100));
    return { kind: "number", value, decimal: false, percent: f.percent };
  }
  if ((m = RE_FRAC.exec(s))) {
    const a = num(m[1]), b = num(m[2]);
    if (b.num === 0) return { kind: "unparsed" };
    const f = tailFlags(m[3]);
    let value = div(a, b);
    if (f.cents) value = div(value, frac(100));
    return { kind: "fraction", value, a, b, percent: f.percent };
  }
  if ((m = RE_NUMBER.exec(s))) {
    const f = tailFlags(m[2]);
    let value = num(m[1]);
    if (f.cents) value = div(value, frac(100));
    return { kind: "number", value, decimal: m[1].includes("."), percent: f.percent };
  }
  // Short free-text answers like "girls to boys is 3 to 4" or "she needs 6 minutes".
  const words = s.split(/\s+/).length;
  if (!s.includes("?") && words <= 8) {
    const ratios = [...s.matchAll(new RegExp(String.raw`${NUM}\s*(?::|\bto\b)\s*${NUM}`, "g"))];
    const nums = s.match(/\d+(?:\.\d+)?/g) || [];
    if (ratios.length === 1 && nums.length === 2) return parseAnswer(ratios[0][0]);
    if (nums.length === 1 && words <= 6 && !s.includes(":") && !s.includes("/")) {
      const rest = s.slice(s.indexOf(nums[0]));
      return parseAnswer(rest);
    }
  }
  return { kind: "unparsed" };
}

const close = (a, b) => Math.abs(toNumber(a) - toNumber(b)) <= 0.01 + 1e-12;

function valueMatches(p, target) {
  if (eq(p.value, target)) return true;
  return p.decimal && close(p.value, target);
}

// Returns { status, tag, parsed }
// status: correct | simplify | wrong | format | unparsed
export function checkAnswer(problem, raw) {
  const parsed = parseAnswer(raw);
  if (parsed.kind === "empty" || parsed.kind === "unparsed") return { status: "unparsed", tag: null, parsed };

  if (problem.answer_type === "ratio") {
    let a, b;
    if (parsed.kind === "ratio" || parsed.kind === "fraction") { a = parsed.a; b = parsed.b; }
    else return { status: "format", tag: null, parsed, reason: "needs_ratio" };
    const [A, B] = problem.answer;
    const same = (x, y, X, Y) => x.num * y.den * Y === y.num * x.den * X; // x/y == X/Y
    if (same(a, b, A, B)) {
      const exact = a.den === 1 && b.den === 1 && a.num === A && b.num === B;
      if (exact || !problem.simplest) return { status: "correct", tag: null, parsed };
      return { status: "simplify", tag: null, parsed };
    }
    for (const w of problem.known_wrong) {
      const [X, Y] = w.value;
      if (same(a, b, X, Y)) return { status: "wrong", tag: w.tag, parsed };
    }
    if (same(b, a, A, B)) return { status: "wrong", tag: "M2", parsed };
    return { status: "wrong", tag: null, parsed };
  }

  // fraction and number problems compare a single value
  if (parsed.kind === "ratio") {
    if (problem.answer_type === "fraction") {
      parsed.value = div(parsed.a, parsed.b);
    } else {
      return { status: "format", tag: null, parsed, reason: "needs_number" };
    }
  }
  let v = parsed;
  if (problem.answer_type === "fraction" && parsed.percent) {
    v = { ...parsed, value: div(parsed.value, frac(100)) };
  }
  const target = fromBank(problem.answer);
  if (valueMatches(v, target)) return { status: "correct", tag: null, parsed };

  if (problem.unit === "percent" && !parsed.percent && valueMatches({ ...v, value: mul(v.value, frac(100)), decimal: v.decimal }, target)) {
    return { status: "format", tag: null, parsed, reason: "needs_percent" };
  }
  for (const w of problem.known_wrong) {
    if (valueMatches(v, fromBank(w.value))) return { status: "wrong", tag: w.tag, parsed };
  }
  return { status: "wrong", tag: null, parsed };
}
