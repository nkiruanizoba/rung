// Verifies every piece of teaching math that the AI or the fallbacks can show a student.
import test from "node:test";
import assert from "node:assert/strict";
import { PROBLEMS, getProblem } from "../lib/problems.js";
import { checkAnswer } from "../lib/checker.js";
import { detectLeak } from "../lib/leak.js";
import { fallbackReply, FORMAT_EXAMPLES, PLACEHOLDER } from "../lib/teaching.js";
import { fromDecimalString, frac, mul, div, eq } from "../lib/fraction.js";

const OPS = {
  "×": (a, b) => mul(a, b),
  "÷": (a, b) => div(a, b),
  "+": (a, b) => frac(a.num * b.den + b.num * a.den, a.den * b.den),
  "−": (a, b) => frac(a.num * b.den - b.num * a.den, a.den * b.den),
};

test("every calculation written in the solution steps is correct", () => {
  let count = 0;
  for (const p of PROBLEMS) {
    for (const line of p.steps) {
      for (const m of line.matchAll(/(\d+(?:\.\d+)?)\s*([×÷+−])\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/g)) {
        const [a, op, b, c] = [fromDecimalString(m[1]), m[2], fromDecimalString(m[3]), fromDecimalString(m[4])];
        assert.ok(eq(OPS[op](a, b), c), `${p.id}: ${m[0]}`);
        count++;
      }
    }
  }
  assert.ok(count >= 30, `expected many checked calculations, got ${count}`);
});

test("each walkthrough's final answer is graded correct by the checker", () => {
  for (const p of PROBLEMS) {
    assert.equal(checkAnswer(p, p.display).status, "correct", `${p.id} display "${p.display}"`);
  }
});

test("the correct answer and every tagged wrong answer grade as expected", () => {
  const show = (v) => (Array.isArray(v) ? `${v[0]}:${v[1]}` : typeof v === "number" ? String(v) : `${v.num}/${v.den}`);
  for (const p of PROBLEMS) {
    const ans = p.answer_type === "fraction" ? `${p.answer[0]}/${p.answer[1]}` : show(p.answer);
    assert.equal(checkAnswer(p, ans).status, "correct", `${p.id} answer ${ans}`);
    for (const w of p.known_wrong) {
      const wrongText = p.answer_type === "fraction" ? `${w.value[0]}/${w.value[1]}` : show(w.value);
      const r = checkAnswer(p, wrongText);
      if (p.answer_type === "ratio" && p.simplest && r.status === "simplify") continue;
      assert.equal(r.status, "wrong", `${p.id} wrong ${wrongText}`);
      assert.equal(r.tag, w.tag, `${p.id} wrong ${wrongText} tag`);
    }
  }
});

test("worked examples come from the same skill and never reveal the current answer", () => {
  for (const p of PROBLEMS) {
    const ex = getProblem(p.example);
    assert.ok(ex, `${p.id} example exists`);
    assert.equal(ex.skill, p.skill, `${p.id} example skill`);
    assert.notEqual(ex.id, p.id);
    const text = `${ex.question}\n${ex.steps.join("\n")}`;
    assert.equal(detectLeak(p, text).leaked, false, `${p.id} example ${ex.id} leaks`);
  }
});

test("the first method step shown to the AI does not contain the answer", () => {
  for (const p of PROBLEMS) assert.equal(detectLeak(p, p.steps[0]).leaked, false, `${p.id}: ${p.steps[0]}`);
});

test("fallback hints for rungs 1 to 3 never leak; the rung 4 walkthrough does contain the answer", () => {
  const tags = [null, "M1", "M2", "M3", "M4", "M5", "partial"];
  for (const p of PROBLEMS) {
    for (const rung of [1, 2, 3]) {
      for (const tag of tags) {
        assert.equal(detectLeak(p, fallbackReply(p, rung, tag)).leaked, false, `${p.id} rung ${rung} ${tag}`);
      }
    }
    assert.equal(detectLeak(p, fallbackReply(p, 4, null)).leaked, true, `${p.id} walkthrough should contain answer`);
  }
});

test("example answers shown to students never match any answer or tagged wrong answer", () => {
  const examples = Object.values(FORMAT_EXAMPLES);
  for (const p of PROBLEMS) {
    for (const ex of examples) {
      // graded as correct, simplify, or a tagged wrong answer would mean the example gives something away
      const r = checkAnswer(p, ex);
      assert.notEqual(r.status, "correct", `${p.id}: example ${ex} is the answer`);
      assert.notEqual(r.status, "simplify", `${p.id}: example ${ex} is equivalent to the answer`);
      if (r.status === "wrong") assert.equal(r.tag, null, `${p.id}: example ${ex} is a tagged wrong answer`);
    }
    for (const ex of examples) assert.ok(PLACEHOLDER.includes(ex));
  }
});
