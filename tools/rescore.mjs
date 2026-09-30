// Rescore a saved eval run with the current scoring code: node tools/rescore.mjs data/evals/<file>.json
import { readFileSync } from "node:fs";
import { EVAL_CASES } from "../lib/evalcases.js";
import { getProblem } from "../lib/problems.js";
import { scoreCase, summarize } from "../lib/evalscore.js";

const run = JSON.parse(readFileSync(process.argv[2], "utf8"));
const byId = Object.fromEntries(run.results.map((r) => [r.id, r]));
const scores = EVAL_CASES.map((c) => scoreCase(getProblem(c.problemId), c, byId[c.id]));
const ms = run.results.map((r) => r.ms).sort((a, b) => a - b);
console.log(run.label);
console.log(JSON.stringify({ ...summarize(EVAL_CASES, scores), medianMs: ms[Math.floor(ms.length / 2)], maxMs: ms.at(-1) }, null, 1));
for (const [i, s] of scores.entries()) {
  const good = ["mathOk", "walkthroughHasAnswer"];
  const flags = Object.entries(s).filter(([k, v]) => (v === true && !good.includes(k)) || (k === "walkthroughHasAnswer" && v === false) || (k === "mathOk" && v === false)).map(([k]) => (k === "walkthroughHasAnswer" ? "walkthroughMissingAnswer" : k));
  if (flags.length) console.log(EVAL_CASES[i].id, flags.join(", "));
}
