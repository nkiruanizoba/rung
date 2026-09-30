import test from "node:test";
import assert from "node:assert/strict";
import { getProblem } from "../lib/problems.js";
import { checkAnswer, parseAnswer } from "../lib/checker.js";

const cases = [
  // [problem, typed answer, expected status, expected tag]
  ["r01", "3:4", "correct"], ["r01", "3 : 4", "correct"], ["r01", "3 to 4", "correct"], ["r01", "3/4", "correct"],
  ["r01", "12:16", "simplify"], ["r01", "6 to 8", "simplify"], ["r01", "4:3", "wrong", "M2"], ["r01", "16:12", "wrong", "M2"],
  ["r01", "3:7", "wrong", "M3"], ["r01", "12:28", "wrong", "M3"], ["r01", "12", "format"], ["r01", "girls to boys is 3 to 4", "correct"],
  ["r02", "5/8", "correct"], ["r02", "10/16", "correct"], ["r02", "0.625", "correct"], ["r02", "62.5%", "correct"],
  ["r02", "5/3", "wrong", "M3"], ["r02", "3/8", "wrong", "M3"],
  ["r03", "3:2", "correct"], ["r03", "2:3", "wrong", "M2"],
  ["r05", "12", "correct"], ["r05", "12 cups", "correct"], ["r05", "I think 12 cups of flour", "correct"],
  ["r05", "9", "wrong", "M1"], ["r05", "16/3", "wrong", "M4"], ["r05", "5.33", "wrong", "M4"], ["r05", "13", "wrong", null],
  ["r05", "3:4", "format"],
  ["r10", "0.25", "correct"], ["r10", "$0.25", "correct"], ["r10", "$.25", "correct"], ["r10", "25 cents", "correct"],
  ["r10", "1/4", "correct"], ["r10", "4", "wrong", "M4"], ["r10", "$36", "wrong", "M4"],
  ["r11", "30", "correct"], ["r11", "44.5", "wrong", "M1"], ["r11", "0.03", "wrong", "M4"],
  ["r12", "144 pages", "correct"],
  ["r14", "75%", "correct"], ["r14", "75 percent", "correct"], ["r14", "75", "correct"], ["r14", "0.75", "format"],
  ["r14", "133.33", "wrong", "M5"],
  ["r15", "$30", "correct"], ["r15", "30 dollars", "correct"], ["r15", "10", "wrong", "partial"],
  ["r16", "60", "correct"], ["r16", "2.4", "wrong", "M5"],
  ["r18", "17.5", "correct"], ["r18", "17 1/2", "correct"], ["r18", "35/2 km", "correct"], ["r18", "2.8", "wrong", "M4"],
  ["r19", "y = 20", "correct"], ["r19", "y=20", "correct"], ["r19", "14", "wrong", "M1"],
  ["r20", "6", "correct"], ["r20", "6 cups", "correct"], ["r20", "7", "wrong", "M1"], ["r20", "13.5", "wrong", "M4"],
  ["r07", "she needs 6 minutes", "correct"],
];

for (const [id, input, status, tag] of cases) {
  test(`${id} "${input}" -> ${status}${tag !== undefined ? ` ${tag}` : ""}`, () => {
    const r = checkAnswer(getProblem(id), input);
    assert.equal(r.status, status);
    if (tag !== undefined) assert.equal(r.tag, tag);
  });
}

test("questions and chatter are not treated as answers", () => {
  for (const s of ["", "   ", "hello", "I don't get it", "why is it 6?", "what does ratio mean?", "-5", "can you help me with step 2 of this"]) {
    const k = parseAnswer(s).kind;
    assert.ok(k === "unparsed" || k === "empty", `${JSON.stringify(s)} parsed as ${k}`);
  }
});

test("rounded decimals within 0.01 are accepted", () => {
  const p = { answer_type: "number", answer: { num: 1, den: 3 }, known_wrong: [] };
  assert.equal(checkAnswer(p, "0.33").status, "correct");
  assert.equal(checkAnswer(p, "0.333").status, "correct");
  assert.equal(checkAnswer(p, "0.3").status, "wrong");
});
