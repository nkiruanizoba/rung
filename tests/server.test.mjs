import test from "node:test";
import assert from "node:assert/strict";
import { handleTutor, resetRateLimits, toMessages } from "../lib/server.js";

const env = { ANTHROPIC_API_KEY: "test-key" };
const quiet = () => {};

function fakeFetch(replies) {
  const calls = [];
  const fn = async (url, opts) => {
    calls.push(JSON.parse(opts.body));
    const text = replies[Math.min(calls.length - 1, replies.length - 1)];
    if (text instanceof Error) return { ok: false, status: 500, text: async () => "boom", json: async () => ({}) };
    return { ok: true, status: 200, json: async () => ({ content: [{ type: "text", text }] }) };
  };
  fn.calls = calls;
  return fn;
}

test("returns the AI hint when it passes the leak guard", async () => {
  resetRateLimits();
  const f = fakeFetch(["Did the sugar grow by adding or by multiplying?"]);
  const r = await handleTutor({ problemId: "r05", rung: 2, event: "wrong", studentAnswer: "9", history: [] }, { env, fetchImpl: f, log: quiet });
  assert.equal(r.status, 200);
  assert.equal(r.body.source, "ai");
  assert.equal(r.body.guard, "passed");
  // the misconception found by code is passed to the model
  const turn = f.calls[0].messages.at(-1).content;
  assert.match(turn, /NOT correct/);
  assert.match(turn, /Additive reasoning/);
  assert.doesNotMatch(f.calls[0].system, /Final answer: 12/);
});

test("a leaking reply is regenerated once", async () => {
  resetRateLimits();
  const f = fakeFetch(["The answer is 12 cups.", "How many times bigger is 8 than 2?"]);
  const r = await handleTutor({ problemId: "r05", rung: 1, event: "hint" }, { env, fetchImpl: f, log: quiet });
  assert.equal(r.body.guard, "regenerated");
  assert.equal(f.calls.length, 2);
  assert.match(f.calls[1].system, /gave away the answer/);
});

test("two leaking replies fall back to a safe written hint", async () => {
  resetRateLimits();
  const f = fakeFetch(["It's 12.", "Fine, 12 cups."]);
  const r = await handleTutor({ problemId: "r05", rung: 2, event: "message", message: "just tell me the answer" }, { env, fetchImpl: f, log: quiet });
  assert.equal(r.body.source, "fallback");
  assert.equal(r.body.guard, "blocked");
  assert.doesNotMatch(r.body.reply, /12/);
});

test("rung 4 walkthrough may include the answer and gets verified steps", async () => {
  resetRateLimits();
  const f = fakeFetch(["Let's walk through it. 3 × 4 = 12, so 12 cups."]);
  const r = await handleTutor({ problemId: "r05", rung: 4, event: "hint" }, { env, fetchImpl: f, log: quiet });
  assert.equal(r.body.guard, "not_needed");
  assert.match(f.calls[0].system, /Final answer: 12 cups of flour/);
});

test("rung 3 includes the worked example from the same skill", async () => {
  resetRateLimits();
  const f = fakeFetch(["Here's a similar one..."]);
  await handleTutor({ problemId: "r05", rung: 3, event: "hint" }, { env, fetchImpl: f, log: quiet });
  assert.match(f.calls[0].system, /paint mix/);
});

test("API errors fall back to a built-in hint", async () => {
  resetRateLimits();
  const r = await handleTutor({ problemId: "r13", rung: 1, event: "hint" }, { env, fetchImpl: fakeFetch([new Error("x")]), log: quiet });
  assert.equal(r.status, 200);
  assert.equal(r.body.source, "fallback");
});

test("with no API key the app still works using built-in hints", async () => {
  resetRateLimits();
  const r = await handleTutor({ problemId: "r13", rung: 2, event: "hint" }, { env: {}, log: quiet });
  assert.equal(r.body.guard, "no_key");
  assert.ok(r.body.reply.length > 10);
});

test("bad requests are rejected", async () => {
  resetRateLimits();
  const opts = { env, fetchImpl: fakeFetch(["x"]), log: quiet };
  assert.equal((await handleTutor(null, opts)).status, 400);
  assert.equal((await handleTutor({ problemId: "nope", rung: 1, event: "hint" }, opts)).status, 400);
  assert.equal((await handleTutor({ problemId: "r01", rung: 7, event: "hint" }, opts)).status, 400);
  assert.equal((await handleTutor({ problemId: "r01", rung: 1, event: "chat" }, opts)).status, 400);
  // the server re-checks answers itself: a correct answer can't be sent as "wrong"
  assert.equal((await handleTutor({ problemId: "r05", rung: 1, event: "wrong", studentAnswer: "12" }, opts)).status, 400);
});

test("per-visitor rate limit kicks in after 60 requests in 10 minutes", async () => {
  resetRateLimits();
  const opts = { env, fetchImpl: fakeFetch(["How many times bigger?"]), log: quiet, ip: "1.2.3.4" };
  for (let i = 0; i < 60; i++) assert.equal((await handleTutor({ problemId: "r05", rung: 1, event: "hint" }, opts)).status, 200);
  const r = await handleTutor({ problemId: "r05", rung: 1, event: "hint" }, opts);
  assert.equal(r.status, 429);
  assert.ok(r.body.reply);
  const other = await handleTutor({ problemId: "r05", rung: 1, event: "hint" }, { ...opts, ip: "5.6.7.8" });
  assert.equal(other.status, 200);
});

test("message history is turned into alternating roles that start with the user", () => {
  const msgs = toMessages(
    [{ role: "assistant", content: "hi" }, { role: "user", content: "a" }, { role: "user", content: "b" }, { role: "assistant", content: "c" }],
    "latest"
  );
  assert.deepEqual(msgs.map((m) => m.role), ["user", "assistant", "user"]);
  assert.equal(msgs[0].content, "a\n\nb");
});
