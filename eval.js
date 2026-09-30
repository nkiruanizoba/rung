// Runs the eval set against the live /api/tutor and scores each reply in code.
import { EVAL_CASES } from "./lib/evalcases.js";
import { scoreCase, summarize } from "./lib/evalscore.js";
import { getProblem } from "./lib/problems.js";

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PACE_MS = location.hostname === "localhost" ? 50 : 3500; // stays under the firewall rule (20 requests per minute)

async function callTutor(c) {
  const body = { problemId: c.problemId, rung: c.rung, event: c.event, studentAnswer: c.studentAnswer, message: c.message, history: [] };
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch("/api/tutor", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    if (r.status !== 429) return { status: r.status, ...data };
    $("status").textContent = `Rate limited, waiting a minute before retrying ${c.id}…`;
    await sleep(65000);
  }
  return { status: 429, reply: "", source: "rate_limited" };
}

function flagsFor(s, c) {
  const f = [];
  if (s.source !== "ai") f.push(`not AI (${s.source}/${s.guard})`);
  if (s.finalLeak) f.push("ANSWER LEAKED");
  if (s.modelTriedToLeak) f.push(`model tried to leak (${s.guard})`);
  if (!s.mathOk) f.push(`math error: ${s.badCalcs.join(", ")}`);
  if (s.rung1DidMath) f.push(`nudge did math: ${[...s.rung1NewNumbers].join(", ") || "calculation"}`);
  if (c.rung === 4 && !s.walkthroughHasAnswer) f.push("walkthrough missing answer");
  if (s.tooLong) f.push(`too long (${s.sentences} sentences)`);
  if (s.openerMismatch) f.push("opener doesn't fit");
  if (s.praisesSmart) f.push("praises being smart");
  return f;
}

async function run() {
  $("run").disabled = true;
  $("results").hidden = false;
  const tbody = document.querySelector("#results tbody");
  tbody.innerHTML = "";
  const scores = [];
  const raw = [];
  for (let i = 0; i < EVAL_CASES.length; i++) {
    const c = EVAL_CASES[i];
    const p = getProblem(c.problemId);
    $("status").textContent = `Running ${i + 1} of ${EVAL_CASES.length} (${c.id})…`;
    const t0 = performance.now();
    const res = await callTutor(c);
    const ms = Math.round(performance.now() - t0);
    const s = scoreCase(p, c, res);
    scores.push(s);
    raw.push({ ...c, reply: res.reply, source: res.source, guard: res.guard, ms, score: s });
    const tr = document.createElement("tr");
    const student = c.event === "wrong" ? `answered ${c.studentAnswer}` : c.event === "hint" ? "hint button" : `"${c.message}"`;
    tr.innerHTML = `<td>${c.id}<br><span style="color:var(--muted)">${c.note}</span></td><td></td><td>${c.rung}</td><td></td><td class="reply"></td><td></td>`;
    tr.children[1].textContent = `${p.id}: ${p.question}`;
    tr.children[3].textContent = student;
    tr.children[4].textContent = res.reply || "(no reply)";
    const flags = flagsFor(s, c);
    tr.children[5].innerHTML = flags.length ? flags.map((x) => `<span class="flag"></span>`).join("") : `<span class="ok">✓ all checks pass</span>`;
    tr.children[5].querySelectorAll(".flag").forEach((el, k) => (el.textContent = flags[k]));
    tbody.appendChild(tr);
    if (i < EVAL_CASES.length - 1) await sleep(PACE_MS);
  }
  const sum = summarize(EVAL_CASES, scores);
  const stamp = new Date().toISOString();
  $("summary").hidden = false;
  $("summary").textContent = `EVAL SUMMARY (${stamp})\n` + Object.entries(sum).map(([k, v]) => `${k}: ${v}`).join("\n");
  $("json").hidden = false;
  $("json").value = JSON.stringify({ stamp, summary: sum, results: raw }, null, 1);
  $("status").textContent = "Done.";
  $("run").disabled = false;
}

$("run").addEventListener("click", run);
