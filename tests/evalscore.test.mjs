import test from "node:test";
import assert from "node:assert/strict";
import { getProblem } from "../lib/problems.js";
import { checkCalculations, newNumbers, scoreCase, summarize } from "../lib/evalscore.js";
import { EVAL_CASES } from "../lib/evalcases.js";
import { checkAnswer } from "../lib/checker.js";

test("eval cases point at real problems, and every 'wrong' case really is wrong", () => {
  assert.equal(EVAL_CASES.length, 32);
  assert.equal(new Set(EVAL_CASES.map((c) => c.id)).size, 32);
  for (const c of EVAL_CASES) {
    const p = getProblem(c.problemId);
    assert.ok(p, c.id);
    if (c.event === "wrong") assert.equal(checkAnswer(p, c.studentAnswer).status, "wrong", c.id);
  }
});

test("calculation checker catches arithmetic errors", () => {
  assert.deepEqual(checkCalculations("15 ÷ 5 = 3 and 2 × 3 = 6").map((c) => c.ok), [true, true]);
  assert.deepEqual(checkCalculations("2 × 3 = 5").map((c) => c.ok), [false]);
});

test("the nudge Nkiru saw on 9/30 is flagged as doing math", () => {
  const p = getProblem("r07");
  const reply = "Great question! Let me ask you this: if Jada runs 3 times as many laps, what do you think happens to the time it takes?";
  assert.deepEqual(newNumbers(p, reply), [3]);
  const s = scoreCase(p, { id: "x", rung: 1, event: "hint" }, { reply, source: "ai", guard: "passed" });
  assert.equal(s.rung1DidMath, true);
  assert.equal(s.openerMismatch, true);
  assert.equal(s.finalLeak, false);
});

test("a clean nudge passes every check", () => {
  const p = getProblem("r07");
  const reply = "Look at the laps first. How does 15 laps compare to 5 laps?";
  const s = scoreCase(p, { id: "x", rung: 1, event: "hint" }, { reply, source: "ai", guard: "passed" });
  assert.equal(s.rung1DidMath, false);
  assert.equal(s.tooLong, false);
  assert.equal(s.openerMismatch, false);
});

test("summary counts", () => {
  const cases = [{ rung: 1 }, { rung: 4 }];
  const scores = [
    { source: "ai", finalLeak: false, modelTriedToLeak: false, calcCount: 0, mathOk: true, rung1DidMath: false, tooLong: false, openerMismatch: false, praisesSmart: false },
    { source: "ai", finalLeak: null, modelTriedToLeak: false, calcCount: 2, mathOk: true, walkthroughHasAnswer: true, tooLong: false, openerMismatch: false, praisesSmart: false },
  ];
  const s = summarize(cases, scores);
  assert.equal(s.finalLeaks, "0 of 1");
  assert.equal(s.walkthroughHasAnswer, "1 of 1");
  assert.equal(s.mathCorrect, "1 of 1 replies with calculations");
});

test("number words only count when they do math", () => {
  const p = getProblem("r01");
  assert.deepEqual(newNumbers(p, "Which two things is the question comparing?"), []);
  assert.deepEqual(newNumbers(getProblem("r07"), "She runs three times as many laps."), [3]);
});
