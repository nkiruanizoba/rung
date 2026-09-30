# Rung

**One rung at a time.** Rung is a Socratic AI math tutor for grade 6 and 7 ratios and proportional reasoning. It never hands over the answer. Each request for help is one rung on a four-step hint ladder, and the student does the climbing.

## How it works

- **Hint ladder.** Nudge, targeted hint, worked example with different numbers, then a walkthrough followed by a fresh problem so the last move is still the student's.
- **Code checks the math, not the AI.** Answers are parsed (whole numbers, decimals, fractions, mixed numbers, ratios, money, percents) and compared as exact fractions in `lib/checker.js`. The model is told the result as a fact.
- **Misconception matching.** Known wrong answers map to five research-backed ratio errors (additive reasoning, order reversal, part-to-part vs part-to-whole, wrong operation, percent base error). The next hint targets the error.
- **Answer leak guard.** Before the walkthrough rung, every AI reply is scanned in code for the current answer in any common form (`lib/leak.js`). A leaking reply is regenerated once, then replaced with a pre-written hint.
- **Verified teaching math.** Worked examples and walkthroughs use solution steps stored with each problem. A test checks every calculation in those steps.
- **Skill map.** Bayesian Knowledge Tracing per skill (prior 0.20, learn 0.15, slip 0.10, guess 0.10, mastery at 0.95). A first-try correct answer with no help counts as correct. The next problem comes from the weakest unlocked skill.
- **Privacy.** No accounts, no names, no stored conversations. Progress lives in the browser's local storage. The server logs only counts (problem, rung, source), never what a student types.

## Project layout

```
index.html, styles.css, app.js   front end (no build step)
api/tutor.js                     Vercel serverless function (POST /api/tutor)
lib/server.js                    request validation, rate limits, model call, leak guard
lib/checker.js                   deterministic answer checking
lib/leak.js                      answer leak detection
lib/mastery.js                   Bayesian Knowledge Tracing and problem selection
lib/prompt.js                    system prompt and rung instructions
lib/teaching.js                  misconception library and built-in fallback hints
lib/problems.js                  generated problem bank (do not edit by hand)
data/problem_bank_v1.json        20 problems, answers verified with exact arithmetic
tools/                           bank builder, annotations, local dev server
tests/                           node:test suite
```

## Run locally

Requires Node 20 or newer. No packages to install.

```
npm test                      # run the test suite
node tools/dev_server.mjs     # open http://localhost:3000
```

Without `ANTHROPIC_API_KEY`, the tutor uses its built-in hints, so the whole flow still works.

## Deploy (Vercel)

1. Import this repository into Vercel. Framework preset: Other. No build command.
2. Add the environment variable `ANTHROPIC_API_KEY`.
3. Optional: `RUNG_MODEL` (default `claude-haiku-4-5-20251001`) and `RUNG_DAILY_CAP` (default 3000 requests per server instance per day).
4. Add a Vercel Firewall rate limit rule on `/api/tutor`, and set a monthly spend limit in the Claude Console.

## Research basis

Brown and Burton (1978); Corbett and Anderson (1995); Hart (1984); Karplus, Pulos and Stage (1983); Lamon (2007); Mueller and Dweck (1998); Parker and Leinhardt (1995); VanLehn (2011).

Built by Nkiru Anizoba.
