// Server-side tutor logic, kept separate from the Vercel adapter so it can be tested.
// Stateless: nothing a student types is stored. Only counts are logged.

import { getProblem } from "./problems.js";
import { checkAnswer } from "./checker.js";
import { detectLeak } from "./leak.js";
import { buildSystem, buildTurn } from "./prompt.js";
import { fallbackReply } from "./teaching.js";

export const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const API_URL = "https://api.anthropic.com/v1/messages";

// ---- Best-effort rate limiting (per server instance). The Vercel Firewall rule
// and the Anthropic Console spend limit are the hard backstops.
const WINDOW_MS = 10 * 60 * 1000;
const PER_IP = 60;
const hits = new Map();
let day = "";
let dayCount = 0;

export function rateLimit(ip, env = {}, now = Date.now()) {
  const today = new Date(now).toISOString().slice(0, 10);
  if (today !== day) { day = today; dayCount = 0; }
  const dailyCap = parseInt(env.RUNG_DAILY_CAP || "3000", 10);
  if (dayCount >= dailyCap) return { ok: false, reason: "daily" };
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= PER_IP) { hits.set(ip, list); return { ok: false, reason: "visitor" }; }
  list.push(now);
  hits.set(ip, list);
  dayCount += 1;
  if (hits.size > 5000) hits.clear();
  return { ok: true };
}

export function resetRateLimits() { hits.clear(); day = ""; dayCount = 0; }

// ---- Request validation
function clean(s, max) {
  return String(s ?? "").replace(/[\u0000-\u0008\u000b-\u001f]/g, " ").trim().slice(0, max);
}

export function validate(body) {
  if (!body || typeof body !== "object") return { error: "Bad request" };
  const problem = getProblem(body.problemId);
  if (!problem) return { error: "Unknown problem" };
  const rung = Number(body.rung);
  if (![1, 2, 3, 4].includes(rung)) return { error: "Bad rung" };
  const event = body.event;
  if (!["wrong", "hint", "message"].includes(event)) return { error: "Bad event" };
  const studentAnswer = clean(body.studentAnswer, 60);
  const message = clean(body.message, 300);
  if (event === "message" && !message) return { error: "Empty message" };
  if (event === "wrong" && !studentAnswer) return { error: "Missing answer" };
  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
  const turns = history
    .filter((h) => h && (h.role === "student" || h.role === "tutor") && typeof h.text === "string")
    .map((h) => ({ role: h.role === "student" ? "user" : "assistant", content: clean(h.text, 700) }))
    .filter((h) => h.content);
  return { problem, rung, event, studentAnswer, message, turns };
}

// Anthropic needs alternating roles that start with the user.
export function toMessages(turns, latest) {
  const msgs = [];
  for (const t of [...turns, { role: "user", content: latest }]) {
    const last = msgs[msgs.length - 1];
    if (last && last.role === t.role) last.content += `\n\n${t.content}`;
    else msgs.push({ ...t });
  }
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  return msgs;
}

async function callModel({ env, fetchImpl, system, messages, maxTokens }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const r = await fetchImpl(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: env.RUNG_MODEL || DEFAULT_MODEL, max_tokens: maxTokens, system, messages }),
      signal: controller.signal,
    });
    if (!r.ok) throw new Error(`Anthropic API ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const data = await r.json();
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    if (!text) throw new Error("Empty model reply");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

// Returns { status, body }
export async function handleTutor(rawBody, { ip = "unknown", env = {}, fetchImpl = fetch, log = console.log } = {}) {
  const v = validate(rawBody);
  if (v.error) return { status: 400, body: { error: v.error } };
  const { problem, rung, event, studentAnswer, message, turns } = v;

  let check = null;
  if (event === "wrong") {
    check = checkAnswer(problem, studentAnswer);
    if (check.status !== "wrong") return { status: 400, body: { error: "Answer is not a wrong answer" } };
  }

  const started = Date.now();
  const fallback = () => fallbackReply(problem, rung, check?.tag);
  const done = (reply, source, guard) => {
    log(JSON.stringify({ t: "tutor", problem: problem.id, rung, event, tag: check?.tag || null, source, guard, ms: Date.now() - started }));
    return { status: 200, body: { reply, rung, source, guard } };
  };

  const limit = rateLimit(ip, env);
  if (!limit.ok) {
    log(JSON.stringify({ t: "rate_limited", reason: limit.reason }));
    return { status: 429, body: { error: "rate_limited", reason: limit.reason, reply: fallback(), rung, source: "fallback" } };
  }
  if (!env.ANTHROPIC_API_KEY) return done(fallback(), "fallback", "no_key");

  const system = buildSystem(problem, rung);
  const messages = toMessages(turns, buildTurn({ event, rung, studentAnswer, message, check }));
  const maxTokens = rung >= 3 ? 450 : 220;

  try {
    let reply = await callModel({ env, fetchImpl, system, messages, maxTokens });
    if (rung >= 4) return done(reply, "ai", "not_needed");
    let leak = detectLeak(problem, reply);
    if (!leak.leaked) return done(reply, "ai", "passed");
    // One retry with a firm reminder, then fall back to a safe, pre-written hint.
    const retrySystem = `${system}\n\nIMPORTANT: Your last draft gave away the answer ("${leak.match}"). Write a new reply that does not state or compute the final answer.`;
    reply = await callModel({ env, fetchImpl, system: retrySystem, messages, maxTokens });
    leak = detectLeak(problem, reply);
    if (!leak.leaked) return done(reply, "ai", "regenerated");
    return done(fallback(), "fallback", "blocked");
  } catch (err) {
    log(JSON.stringify({ t: "error", message: String(err.message || err).slice(0, 200) }));
    return done(fallback(), "fallback", "error");
  }
}
