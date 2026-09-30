// Bayesian Knowledge Tracing (Corbett and Anderson, 1995), one estimate per skill,
// plus next-problem selection. Pure functions so they can be tested in Node.

import { PROBLEMS, SKILLS } from "./problems.js";

export const BKT = { prior: 0.2, learn: 0.15, slip: 0.1, guess: 0.1, mastered: 0.95 };

// Which problems count as a win for the skill map (decided 9/29):
// the first answer must be right, and the help used can go up to rung 2 (the Nudge or the
// targeted hint), since neither one does the math for the student. A wrong first answer,
// the worked example or the walkthrough count as "not yet". So a student who needs a hint
// once and then solves the next problem with no help reaches mastery.
export const MAX_RUNG_FOR_WIN = 2;
export function countsAsWin({ wrongCount, rung }) {
  return wrongCount === 0 && rung <= MAX_RUNG_FOR_WIN;
}

export function bktUpdate(p, correct, params = BKT) {
  const { learn, slip, guess } = params;
  const post = correct
    ? (p * (1 - slip)) / (p * (1 - slip) + (1 - p) * guess)
    : (p * slip) / (p * slip + (1 - p) * (1 - guess));
  return post + (1 - post) * learn;
}

export function newProgress() {
  const skills = {};
  for (const s of SKILLS) skills[s.id] = { p: BKT.prior, attempts: 0 };
  return { version: 1, skills, seen: {}, counter: 0 };
}

export const isMastered = (progress, skillId) => progress.skills[skillId].p >= BKT.mastered;

const problemsFor = (skillId) => PROBLEMS.filter((p) => p.skill === skillId);

// A prerequisite is satisfied once it is mastered or every one of its problems has been tried,
// so a student is never stuck behind a skill that has run out of fresh problems.
function prereqDone(progress, skillId) {
  return isMastered(progress, skillId) || problemsFor(skillId).every((p) => progress.seen[p.id]);
}

export function unlockedSkills(progress) {
  return SKILLS.filter((s) => s.prereqs.every((r) => prereqDone(progress, r))).map((s) => s.id);
}

// Pick a problem in a skill: unseen first (bank order), otherwise the least recently seen.
export function pickInSkill(progress, skillId, exclude = []) {
  const pool = problemsFor(skillId).filter((p) => !exclude.includes(p.id));
  const unseen = pool.filter((p) => !progress.seen[p.id]);
  if (unseen.length) return unseen[0];
  if (!pool.length) return null;
  return [...pool].sort((a, b) => progress.seen[a.id] - progress.seen[b.id])[0];
}

// The weakest unlocked skill that is not mastered yet (ties go to the earlier skill).
// Fresh problems come first: a skill that still has unseen problems is chosen before any
// skill would repeat one. So a struggling student moves on after trying all 4 problems in a
// skill, and comes back to it for review once the fresh problems run out.
export function chooseNext(progress, exclude = []) {
  const open = unlockedSkills(progress).filter((id) => !isMastered(progress, id));
  if (!open.length) return null; // everything mastered
  const order = SKILLS.map((s) => s.id);
  open.sort((a, b) => progress.skills[a].p - progress.skills[b].p || order.indexOf(a) - order.indexOf(b));
  const hasFresh = (id) => problemsFor(id).some((p) => !progress.seen[p.id] && !exclude.includes(p.id));
  const skill = open.find(hasFresh) || open[0];
  return pickInSkill(progress, skill, exclude);
}

// After a walkthrough: a fresh problem in the same skill, avoiding the one just walked
// through and the worked example the student already saw.
export function chooseSimilar(progress, problem) {
  return (
    pickInSkill(progress, problem.skill, [problem.id, problem.example]) ||
    pickInSkill(progress, problem.skill, [problem.id])
  );
}

export function recordOutcome(progress, problem, correct) {
  const s = progress.skills[problem.skill];
  s.p = bktUpdate(s.p, correct);
  s.attempts += 1;
  return progress;
}

export function markSeen(progress, problemId) {
  progress.counter += 1;
  progress.seen[problemId] = progress.counter;
  return progress;
}
