import test from "node:test";
import assert from "node:assert/strict";
import { getProblem } from "../lib/problems.js";
import { detectLeak } from "../lib/leak.js";

const leaks = [
  ["r05", "So the answer is 12 cups of flour."],
  ["r05", "3 × 4 = 12, so that's how much flour."],
  ["r05", "You need twelve cups."],
  ["r01", "The ratio is 3:4."],
  ["r01", "It works out to 3 to 4."],
  ["r01", "Girls to boys is 12 : 16, now simplify."],
  ["r02", "Apples are 5 out of 8 pieces."],
  ["r02", "That's 0.625 of the fruit."],
  ["r02", "That's 62.5% of the fruit."],
  ["r10", "Each pencil is $0.25."],
  ["r10", "Each pencil costs 25 cents."],
  ["r10", "One pencil costs 1/4 of a dollar."],
  ["r14", "That means 75% chose pizza."],
  ["r18", "That's 17.5 km."],
  ["r18", "That's 35/2 km."],
  ["r18", "That's 17 1/2 km."],
  ["r20", "4 × 1.5 = 6"],
  ["r20", "So they need 6 cups of broth."],
  ["r09", "The car goes fifty miles each hour."],
];

const safe = [
  ["r05", "The sugar went from 2 cups to 8 cups. How many times bigger is that?"],
  ["r05", "Did the sugar grow by adding or by multiplying? 8 ÷ 2 = 4 might help."],
  ["r01", "Which group does the question name first, girls or boys?"],
  ["r02", "How many pieces of fruit are there in all?"],
  ["r10", "What would you divide to find the cost of 1 pencil?"],
  ["r14", "What is the whole group here? Try dividing the part by the whole."],
  ["r20", "The recipe is for 6 people. How many times bigger is 9 than 6?"],
  ["r20", "If there are 6 people, the soup uses 4 cups. What about 9 people?"],
  ["r18", "How many km does 1 cm stand for? Try 5 ÷ 2."],
  ["r13", "What is 10% of 60? You can build 30% from that."],
];

for (const [id, text] of leaks) {
  test(`blocks leak for ${id}: ${text}`, () => assert.equal(detectLeak(getProblem(id), text).leaked, true));
}
for (const [id, text] of safe) {
  test(`allows safe hint for ${id}: ${text}`, () => assert.equal(detectLeak(getProblem(id), text).leaked, false));
}
