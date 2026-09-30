// Answer leak guard. Before rung 4, the server scans every AI reply for the
// current problem's final answer (in any common form) and blocks it.

import { frac, fromDecimalString, fromBank, eq, div, toNumber } from "./fraction.js";

const WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
};

const N = String.raw`(\d+(?:\.\d+)?|\.\d+)`;

function normalize(text) {
  let s = String(text || "").toLowerCase();
  s = s.replace(/[−–—]/g, "-").replace(/\$/g, "").replace(/(\d),(\d{3})\b/g, "$1$2");
  s = s.replace(/\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[- ](one|two|three|four|five|six|seven|eight|nine)\b/g,
    (_, t, o) => String(WORDS[t] + WORDS[o]));
  s = s.replace(new RegExp(String.raw`\b(${Object.keys(WORDS).join("|")})\b`, "g"), (w) => String(WORDS[w]));
  return s;
}

// Every number-like thing in the text, with its position and a little context.
export function extractTokens(text) {
  const s = normalize(text);
  const pairs = [];
  const values = [];
  const pairRe = new RegExp(String.raw`${N}\s*(:|/|\bto\b|\bout of\b|\bfor every\b)\s*${N}`, "g");
  for (const m of s.matchAll(pairRe)) {
    pairs.push({ a: fromDecimalString(m[1]), b: fromDecimalString(m[3]), sep: m[2], index: m.index });
    if (m[2] === "/" || m[2] === "out of") {
      const b = fromDecimalString(m[3]);
      if (b.num !== 0) values.push({ value: div(fromDecimalString(m[1]), b), index: m.index, end: m.index + m[0].length });
    }
  }
  const mixedRe = /(\d+)\s+(\d+)\s*\/\s*(\d+)/g;
  for (const m of s.matchAll(mixedRe)) {
    const d = parseInt(m[3], 10);
    if (d) values.push({ value: frac(parseInt(m[1], 10) * d + parseInt(m[2], 10), d), index: m.index, end: m.index + m[0].length });
  }
  const numRe = new RegExp(String.raw`(?<![\d.])${N}(?![\d])(\s*(?:%|percent|¢|cents?\b))?`, "g");
  for (const m of s.matchAll(numRe)) {
    let value = fromDecimalString(m[1]);
    if (!value) continue;
    if (m[2] && /¢|cent/.test(m[2]) && !/percent/.test(m[2])) value = div(value, frac(100));
    values.push({ value, index: m.index, end: m.index + m[0].length, percent: !!(m[2] && /%|percent/.test(m[2])) });
  }
  return { s, pairs, values };
}

const near = (a, b) => Math.abs(toNumber(a) - toNumber(b)) < 1e-9;

// Returns { leaked: boolean, match?: string }
export function detectLeak(problem, reply) {
  const { s, pairs, values } = extractTokens(reply);
  const q = extractTokens(problem.question);

  if (problem.answer_type === "ratio" || problem.answer_type === "fraction") {
    const [A, B] = problem.answer;
    const target = frac(A, B);
    const inQuestion = (p) => q.pairs.some((x) => eq(x.a, p.a) && eq(x.b, p.b));
    for (const p of pairs) {
      if (p.b.num === 0) continue;
      if (eq(div(p.a, p.b), target) && !inQuestion(p)) return { leaked: true, match: s.slice(p.index, p.index + 20) };
    }
    if (problem.answer_type === "fraction") {
      for (const v of values) {
        if (near(v.value, target)) return { leaked: true, match: s.slice(v.index, v.end) };
        // 62.5% style
        if (v.percent && near(div(v.value, frac(100)), target)) {
          return { leaked: true, match: s.slice(v.index, v.end) };
        }
      }
    }
    return { leaked: false };
  }

  // number answers
  const target = fromBank(problem.answer);
  const answerInQuestion = q.values.some((v) => near(v.value, target));
  const unit = problem.unit && problem.unit !== "percent" ? problem.unit : null;
  for (const v of values) {
    if (!near(v.value, target)) continue;
    if (!answerInQuestion) return { leaked: true, match: s.slice(v.index, v.end) };
    // The answer's number also appears in the question (for example "6 people" with answer 6 cups),
    // so only count it when it is stated as a result or with the answer's unit.
    const before = s.slice(Math.max(0, v.index - 12), v.index);
    const after = s.slice(v.end, v.end + 16);
    const followers = q.values
      .filter((x) => near(x.value, target))
      .map((x) => (q.s.slice(x.end).match(/^\s*([a-z]+)/) || [])[1])
      .filter(Boolean);
    const nextWord = (after.match(/^\s*([a-z]+)/) || [])[1];
    if (nextWord && followers.includes(nextWord)) continue; // "6 people" talks about the question, not the answer
    const asResult = /(=|\bis|\bare|\bequals|\bget|\bneed|\bneeds)\s*$/.test(before);
    const withUnit = unit && new RegExp(String.raw`^\s*(${unit}|${unit.replace(/s$/, "")})\b`).test(after);
    if (asResult || withUnit) return { leaked: true, match: s.slice(Math.max(0, v.index - 6), v.end + 8) };
  }
  return { leaked: false };
}
