// Automated scoring for eval replies. Everything here is checked in code; quality and tone
// are left for a human read of the replies.

import { detectLeak } from "./leak.js";
import { fromDecimalString, frac, mul, div, eq, toNumber } from "./fraction.js";

const OPS = {
  "×": mul, "x": mul, "*": mul,
  "÷": div, "/": div,
  "+": (a, b) => frac(a.num * b.den + b.num * a.den, a.den * b.den),
  "−": (a, b) => frac(a.num * b.den - b.num * a.den, a.den * b.den),
  "-": (a, b) => frac(a.num * b.den - b.num * a.den, a.den * b.den),
};

// Every "a op b = c" in the reply, checked with exact arithmetic.
export function checkCalculations(text) {
  const calcs = [];
  const re = /(\d+(?:\.\d+)?)\s*([×x*÷\/+−-])\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/g;
  for (const m of String(text).matchAll(re)) {
    const a = fromDecimalString(m[1]), b = fromDecimalString(m[3]), c = fromDecimalString(m[4]);
    if (!a || !b || !c || ((m[2] === "÷" || m[2] === "/") && b.num === 0)) continue;
    const got = OPS[m[2]](a, b);
    const ok = eq(got, c) || Math.abs(toNumber(got) - toNumber(c)) < 0.005;
    calcs.push({ expr: m[0], ok });
  }
  return calcs;
}

const IGNORE = new Set([0, 1, 100]);

// Numbers in the reply that are not in the problem (a sign the tutor did a step for the student).
// Digits count; number words count only as "N times" (so "which two things" is not flagged).
const TIMES_WORDS = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twice: 2, double: 2, triple: 3 };
function digitNumbers(text) {
  const out = [];
  for (const m of String(text).replace(/(\d),(\d{3})\b/g, "$1$2").matchAll(/(?<![\d.])(\d+(?:\.\d+)?|\.\d+)(?![\d])/g)) out.push(Number(m[1]));
  for (const m of String(text).toLowerCase().matchAll(/\b(two|three|four|five|six|seven|eight|nine|ten)\s+times\b|\b(twice|double|triple)\b/g)) out.push(TIMES_WORDS[m[1] || m[2]]);
  return out;
}
export function newNumbers(problem, text, studentText = "") {
  // numbers from the question, or from the student's own words, don't count
  const inQ = [...digitNumbers(problem.question), ...digitNumbers(studentText)];
  const extra = digitNumbers(text).filter((n) => !IGNORE.has(n) && !inQ.some((q) => Math.abs(q - n) < 1e-9));
  return [...new Set(extra)];
}

export function countSentences(text) {
  return String(text).split(/[.!?]+(?:\s|$)/).map((s) => s.trim()).filter((s) => /[a-z0-9]/i.test(s)).length;
}

const METHOD_WORDS = /\b(times (bigger|as|more)|multiply|multiplying|multiplied|divide|dividing|divided|add|adding|subtract|subtracting)\b/i;

export function scoreCase(problem, c, res) {
  const reply = res.reply || "";
  const calcs = checkCalculations(reply);
  const leak = c.rung < 4 ? detectLeak(problem, reply).leaked : null;
  const lines = reply.split("\n").filter((l) => l.trim()).length;
  const sentences = countSentences(reply);
  const extra = c.rung === 1 ? newNumbers(problem, reply, `${c.studentAnswer || ""} ${c.message || ""}`) : [];
  return {
    id: c.id,
    source: res.source || "none",
    guard: res.guard || "none",
    finalLeak: leak,                                        // answer visible to the student before rung 4
    modelTriedToLeak: res.guard === "regenerated" || res.guard === "blocked",
    calcCount: calcs.length,
    mathOk: calcs.every((x) => x.ok),
    badCalcs: calcs.filter((x) => !x.ok).map((x) => x.expr),
    rung1DidMath: c.rung === 1 ? extra.length > 0 || calcs.length > 0 : null,
    rung1NewNumbers: extra,
    walkthroughHasAnswer: c.rung === 4 ? detectLeak(problem, reply).leaked : null,
    sentences,
    tooLong: c.rung <= 2 ? sentences > 3 : lines > 8,
    openerMismatch: c.event !== "message" && /^\s*(great|good|excellent|awesome) question/i.test(reply),
    praisesSmart: /\b(smart|genius|clever|brilliant)\b/i.test(reply),
    rung1NamesMethod: c.rung === 1 ? METHOD_WORDS.test(reply) : null,  // a nudge should point attention, not name the method
    stockOpener: /^\s*(good|great|nice|awesome|excellent) (try|job|thinking|work|question)\b/i.test(reply),
    emDash: /—/.test(reply),
    markdown: /\*[^*\n]+\*|^#+\s/m.test(reply),
    mentionsApp: /\bthe app\b/i.test(reply),
  };
}

export function summarize(cases, scores) {
  const n = scores.length;
  const pre4 = scores.filter((s, i) => cases[i].rung < 4);
  const r1 = scores.filter((s, i) => cases[i].rung === 1);
  const r4 = scores.filter((s, i) => cases[i].rung === 4);
  const withCalc = scores.filter((s) => s.calcCount > 0);
  const count = (arr, f) => arr.filter(f).length;
  return {
    turns: n,
    aiReplies: count(scores, (s) => s.source === "ai"),
    fallbackReplies: count(scores, (s) => s.source !== "ai"),
    finalLeaks: `${count(pre4, (s) => s.finalLeak)} of ${pre4.length}`,
    leakAttemptsCaught: `${count(scores, (s) => s.modelTriedToLeak)} of ${n}`,
    mathCorrect: `${count(withCalc, (s) => s.mathOk)} of ${withCalc.length} replies with calculations`,
    rung1DidMath: `${count(r1, (s) => s.rung1DidMath)} of ${r1.length}`,
    walkthroughHasAnswer: `${count(r4, (s) => s.walkthroughHasAnswer)} of ${r4.length}`,
    tooLong: `${count(scores, (s) => s.tooLong)} of ${n}`,
    openerMismatch: `${count(scores, (s) => s.openerMismatch)} of ${n}`,
    praisesSmart: `${count(scores, (s) => s.praisesSmart)} of ${n}`,
    rung1NamesMethod: `${count(r1, (s) => s.rung1NamesMethod)} of ${r1.length}`,
    stockOpener: `${count(scores, (s) => s.stockOpener)} of ${n}`,
    emDash: `${count(scores, (s) => s.emDash)} of ${n}`,
    markdown: `${count(scores, (s) => s.markdown)} of ${n}`,
    mentionsApp: `${count(scores, (s) => s.mentionsApp)} of ${n}`,
  };
}
