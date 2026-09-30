// Misconception library, rung definitions and deterministic fallback hints.
// Fallbacks are used when the AI is unavailable or when its reply fails the leak guard.

import { getProblem } from "./problems.js";

export const MISCONCEPTIONS = {
  M1: {
    name: "Additive reasoning",
    what: "added the same amount to both quantities instead of multiplying both by the same number",
    guidance: "Ask whether the amounts grow by adding or by multiplying. Point the student to how many times bigger one amount got.",
    fallback: "Did the amounts grow by adding the same number, or by multiplying by the same number? Check how many times bigger one amount got.",
  },
  M2: {
    name: "Order reversal",
    what: "wrote the ratio in the wrong order",
    guidance: "Have the student reread which quantity the question names first. Don't say the correct order outright.",
    fallback: "Look at the order the question uses. Which thing does it name first? That one goes first in your ratio.",
  },
  M3: {
    name: "Part-to-part vs part-to-whole",
    what: "mixed up comparing a part to another part with comparing a part to the whole",
    guidance: "Ask whether the question compares a part to a part or a part to the whole group, and what the whole is.",
    fallback: "Is the question comparing one part to another part, or one part to the whole group? What counts as the whole here?",
  },
  M4: {
    name: "Wrong operation or rate inversion",
    what: "divided the wrong way or multiplied when they should divide",
    guidance: "Ask the student to check the direction of the operation and whether the size of their answer makes sense.",
    fallback: "Check the direction of your math. Should your answer be bigger or smaller than the numbers you started with?",
  },
  M5: {
    name: "Percent base error",
    what: "used the wrong whole for the percent, or treated the percent as a plain count",
    guidance: "Ask what the whole (the 100%) is in this problem and what the percent means as a number out of 100.",
    fallback: "A percent means out of 100. What is the whole amount here, the one that counts as 100%?",
  },
  partial: {
    name: "Stopped early",
    what: "did a correct first step but stopped before the last step",
    guidance: "Praise the correct first step, then ask the student to reread what the question finally asks for.",
    fallback: "You found an important piece! Read the question again. Is that the final thing it asks for?",
  },
};

export const RUNGS = {
  1: { name: "Nudge" },
  2: { name: "Hint" },
  3: { name: "Example" },
  4: { name: "Walkthrough" },
};

const NUDGE = {
  S1: "Which two things is the question comparing, and which one comes first?",
  S2: "Look at the amount you know on both sides. How did it change?",
  S3: "What would the amount be for just 1?",
  S4: "What is the whole here, the amount that counts as 100%?",
  S5: "How are the two amounts connected? What stays the same as they change?",
};

const SKILL_HINT = {
  S1: "Read the question again and find the two amounts it compares, in the order it names them.",
  S2: "In equivalent ratios, both amounts get multiplied by the same number. What number turns one amount into the other?",
  S3: "A unit rate tells you how much for 1. What should you divide to find the amount for 1?",
  S4: "Write the percent as a fraction or a decimal first, then use it with the whole.",
  S5: "Find the amount for 1 first, or find how many times bigger the new amount is. Then use it.",
};

export function fallbackReply(problem, rung, tag) {
  if (rung <= 1) return NUDGE[problem.skill];
  if (rung === 2) return (tag && MISCONCEPTIONS[tag]?.fallback) || SKILL_HINT[problem.skill];
  if (rung === 3) {
    const ex = getProblem(problem.example);
    return `Here's a similar problem with different numbers.\n\n${ex.question}\n\n${ex.steps.join("\n")}\n\nNow try yours.`;
  }
  return `Let's walk through it together.\n\n${problem.steps.join("\n")}\n\nNice work sticking with it. A new problem like this one is ready for you.`;
}
