import test from "node:test";
import assert from "node:assert/strict";
import { BKT, bktUpdate, countsAsWin, newProgress, chooseNext, chooseSimilar, recordOutcome, markSeen, isMastered, unlockedSkills } from "../lib/mastery.js";
import { getProblem, PROBLEMS } from "../lib/problems.js";

test("BKT update matches the textbook formula", () => {
  // correct from 0.2: posterior = .2*.9 / (.2*.9 + .8*.1) = .18/.26; then + (1-post)*.15
  const post = 0.18 / 0.26;
  assert.ok(Math.abs(bktUpdate(0.2, true) - (post + (1 - post) * 0.15)) < 1e-12);
  const postW = 0.02 / (0.02 + 0.72);
  assert.ok(Math.abs(bktUpdate(0.2, false) - (postW + (1 - postW) * 0.15)) < 1e-12);
});

test("two first-try correct answers from the prior reach mastery; a miss lowers the estimate", () => {
  let p = BKT.prior;
  p = bktUpdate(p, true);
  assert.ok(p < BKT.mastered);
  p = bktUpdate(p, true);
  assert.ok(p >= BKT.mastered);
  assert.ok(bktUpdate(0.6, false) < 0.6);
});

test("a new student starts on S1, and only S1 is unlocked", () => {
  const pr = newProgress();
  assert.deepEqual(unlockedSkills(pr), ["S1"]);
  assert.equal(chooseNext(pr).id, "r01");
});

test("mastering S1 unlocks S2; mastering S2 unlocks S3 and S5 but not S4", () => {
  const pr = newProgress();
  pr.skills.S1.p = 0.97;
  assert.deepEqual(unlockedSkills(pr), ["S1", "S2"]);
  assert.equal(chooseNext(pr).skill, "S2");
  pr.skills.S2.p = 0.97;
  assert.deepEqual(unlockedSkills(pr), ["S1", "S2", "S3", "S5"]);
});

test("the weakest unlocked, unmastered skill is chosen", () => {
  const pr = newProgress();
  pr.skills.S1.p = 0.97; pr.skills.S2.p = 0.97;
  pr.skills.S3.p = 0.5; pr.skills.S5.p = 0.3;
  assert.equal(chooseNext(pr).skill, "S5");
});

test("a student is never stuck: an exhausted prerequisite unlocks the next skill", () => {
  const pr = newProgress();
  for (const p of PROBLEMS.filter((x) => x.skill === "S1")) { markSeen(pr, p.id); recordOutcome(pr, p, false); }
  assert.ok(!isMastered(pr, "S1"));
  assert.ok(unlockedSkills(pr).includes("S2"));
  assert.ok(chooseNext(pr));
});

test("after a walkthrough, the similar problem is a different one in the same skill", () => {
  const pr = newProgress();
  const p = getProblem("r05");
  markSeen(pr, p.id);
  const next = chooseSimilar(pr, p);
  assert.equal(next.skill, p.skill);
  assert.notEqual(next.id, p.id);
  assert.notEqual(next.id, p.example);
});

test("when everything is mastered there is no next problem", () => {
  const pr = newProgress();
  for (const s of Object.keys(pr.skills)) pr.skills[s].p = 0.99;
  assert.equal(chooseNext(pr), null);
});

test("win rule: a right first answer with at most the Nudge or targeted hint", () => {
  assert.equal(countsAsWin({ wrongCount: 0, rung: 0 }), true);
  assert.equal(countsAsWin({ wrongCount: 0, rung: 1 }), true);
  assert.equal(countsAsWin({ wrongCount: 0, rung: 2 }), true);
  assert.equal(countsAsWin({ wrongCount: 0, rung: 3 }), false);
  assert.equal(countsAsWin({ wrongCount: 0, rung: 4 }), false);
  assert.equal(countsAsWin({ wrongCount: 1, rung: 1 }), false);
});

test("a hint-assisted win followed by one clean answer reaches mastery", () => {
  let p = BKT.prior;
  p = bktUpdate(p, countsAsWin({ wrongCount: 0, rung: 2 }));
  assert.ok(p < BKT.mastered);
  p = bktUpdate(p, countsAsWin({ wrongCount: 0, rung: 0 }));
  assert.ok(p >= BKT.mastered);
});

test("a student who keeps struggling moves through fresh problems before any repeats", () => {
  const pr = newProgress();
  const seq = [];
  for (let i = 0; i < 24; i++) {
    const p = chooseNext(pr, seq.length ? [seq.at(-1)] : []);
    seq.push(p.id);
    markSeen(pr, p.id);
    recordOutcome(pr, p, false);
  }
  const first20 = seq.slice(0, 20);
  assert.equal(new Set(first20).size, 20, `repeats too early: ${first20.join(" ")}`);
  assert.deepEqual(first20.slice(0, 4), ["r01", "r02", "r03", "r04"]);
});
