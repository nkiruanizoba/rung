// Rung front end. Answers are checked here with code (lib/checker.js); the AI only writes hints.

import { PROBLEMS, SKILLS, getProblem } from "./lib/problems.js";
import { checkAnswer } from "./lib/checker.js";
import { BKT, countsAsWin, MAX_RUNG_FOR_WIN, newProgress, chooseNext, chooseSimilar, recordOutcome, markSeen, markExampleShown, isMastered, unlockedSkills } from "./lib/mastery.js";
import { fallbackReply, RUNGS, FORMAT_EXAMPLES as EX, PLACEHOLDER } from "./lib/teaching.js";

const STORE_KEY = "rung.progress.v1";
const $ = (id) => document.getElementById(id);

// ---------- storage (progress stays in this browser only)
function loadProgress() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.version === 1 && p.skills && SKILLS.every((s) => p.skills[s.id])) return p;
    }
  } catch { /* storage blocked or corrupt: start fresh */ }
  return newProgress();
}
function saveProgress() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state.progress)); } catch { /* ignore */ }
}

// ---------- state
const state = {
  progress: loadProgress(),
  problem: null,
  rung: 0,            // highest rung of help used on this problem
  recorded: false,    // mastery outcome recorded for this problem?
  wrongCount: 0,
  history: [],        // this problem's conversation, sent to the server for context
  phase: "solving",   // solving | solved | walked
  busy: false,
  firstVisit: true,
};

// ---------- rendering
const LOCK = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
const TICK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-6.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function renderSkills() {
  const unlocked = unlockedSkills(state.progress);
  $("skillList").innerHTML = "";
  SKILLS.forEach((s, i) => {
    const st = state.progress.skills[s.id];
    const mastered = isMastered(state.progress, s.id);
    const locked = !unlocked.includes(s.id) && !mastered;
    const pct = Math.round(Math.min(st.p / BKT.mastered, 1) * 100);
    const li = document.createElement("li");
    li.className = "skill" + (mastered ? " mastered" : "") + (locked ? " locked" : "") +
      (state.problem && state.problem.skill === s.id ? " current" : "");
    const label = mastered ? "Mastered" : locked ? "Locked" : st.attempts ? "Learning" : "Ready";
    const inner = mastered ? TICK : locked ? LOCK : String(i + 1);
    li.innerHTML = `<span class="node" style="--pct:${locked ? 0 : pct}"><span class="core">${inner}</span></span>` +
      `<span class="name"><span class="full"></span><span class="short"></span></span><span class="state">${label}</span>`;
    li.querySelector(".full").textContent = s.name;
    li.querySelector(".short").textContent = s.short;
    li.title = `${s.name} (${s.standard}): ${label}`;
    $("skillList").appendChild(li);
  });
}

let litRung = 0;
function renderRungs() {
  document.querySelectorAll("#rungs li").forEach((li) => {
    const n = Number(li.dataset.rung);
    li.classList.toggle("on", n <= state.rung);
    li.classList.toggle("just-lit", n === state.rung && state.rung > litRung);
  });
  litRung = state.rung;
  const next = Math.min(state.rung + 1, 4);
  const NEXT_LABEL = { 1: "Get a nudge", 2: "Get a hint", 3: "See an example", 4: "Walk me through it" };
  $("hintNext").textContent = state.rung >= 4 ? "All rungs used" : NEXT_LABEL[next];
  $("ladder").classList.toggle("active", state.rung > 0);
  $("ladderStatus").textContent = state.rung === 0
    ? "No help yet"
    : `Rung ${state.rung} of 4: ${RUNGS[state.rung].name}`;
}

function renderControls() {
  const solving = state.phase === "solving";
  $("answerForm").hidden = !solving;
  $("helperRow").hidden = !solving;
  $("nextRow").hidden = solving;
  $("nextBtn").textContent = state.phase === "walked" ? "Try a similar problem →" : "Next problem →";
  for (const id of ["checkBtn", "hintBtn", "askBtn", "answerInput"]) $(id).disabled = state.busy;
  $("hintBtn").disabled = state.busy || state.rung >= 4;
}

function addMsg(role, text, extra = {}) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  if (role === "tutor") {
    div.classList.add("has-avatar");
    const av = document.createElement("span");
    av.className = "avatar";
    av.setAttribute("aria-hidden", "true");
    av.innerHTML = '<svg viewBox="0 0 32 32"><path d="M10 5v22M22 5v22" stroke="#FAF7F2" stroke-width="3" stroke-linecap="round"/><path d="M10 10.5h12M10 16h12M10 21.5h12" stroke="#F2A33A" stroke-width="3" stroke-linecap="round"/></svg>';
    div.appendChild(av);
    const who = document.createElement("span");
    who.className = "who";
    who.textContent = extra.rung ? `Rung · ` : "Rung";
    if (extra.rung) {
      const tag = document.createElement("span");
      tag.className = "rung-tag";
      tag.textContent = RUNGS[extra.rung].name;
      who.appendChild(tag);
    }
    div.appendChild(who);
  }
  div.appendChild(document.createTextNode(text));
  $("thread").appendChild(div);
  if (!extra.noScroll) scrollDown();
  return div;
}

function addVerdict(kind, text) {
  const div = document.createElement("div");
  div.className = `verdict ${kind}`;
  div.textContent = text;
  $("thread").appendChild(div);
  scrollDown();
}

function addTyping() {
  const div = document.createElement("div");
  div.className = "msg tutor";
  div.classList.add("has-avatar");
  div.innerHTML = `<span class="avatar" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M10 5v22M22 5v22" stroke="#FAF7F2" stroke-width="3" stroke-linecap="round"/><path d="M10 10.5h12M10 16h12M10 21.5h12" stroke="#F2A33A" stroke-width="3" stroke-linecap="round"/></svg></span><span class="who">Rung</span><span class="typing" aria-label="Rung is thinking"><i></i><i></i><i></i></span>`;
  $("thread").appendChild(div);
  scrollDown();
  return div;
}

function scrollDown() {
  requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
}

// ---------- problem flow
function showProblem(problem) {
  if (!problem) return showDone();
  $("doneCard").hidden = true;
  $("problemCard").hidden = false;
  $("ladder").hidden = false;
  litRung = 0;
  Object.assign(state, { problem, rung: 0, recorded: false, wrongCount: 0, history: [], phase: "solving" });
  markSeen(state.progress, problem.id);
  saveProgress();
  const skill = SKILLS.find((s) => s.id === problem.skill);
  $("skillPill").textContent = skill.name;
  $("standard").textContent = `CCSS ${skill.standard}`;
  $("question").textContent = problem.question;
  $("thread").innerHTML = "";
  if (state.firstVisit) {
    addMsg("tutor", "Hi! I'm Rung. I won't just tell you answers. I give one rung of help at a time, and you do the climbing.\n\nType your answer and tap Check. Stuck? Tap Hint, or ask me a question.", { noScroll: true });
    state.firstVisit = false;
  }
  renderSkills();
  renderRungs();
  renderControls();
  $("answerInput").value = "";
  window.scrollTo({ top: 0 });
}

function showDone() {
  state.problem = null;
  $("problemCard").hidden = true;
  $("thread").innerHTML = "";
  $("doneCard").hidden = false;
  $("answerForm").hidden = true;
  $("helperRow").hidden = true;
  $("nextRow").hidden = true;
  $("ladder").hidden = true;
  renderSkills();
}

function record(correct) {
  if (state.recorded) return;
  state.recorded = true;
  recordOutcome(state.progress, state.problem, correct);
  saveProgress();
  renderSkills();
}

const PRAISE_FIRST = [
  "You set that up carefully and it paid off.",
  "Nice work. Your plan was solid.",
  "You got it on your own. Great thinking about how the amounts connect.",
];
const PRAISE_CLIMB = [
  "You kept climbing and got there. That's how learning works.",
  "Sticking with it paid off. You did the last step yourself.",
  "Nice persistence. You used the help and did the climbing.",
];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function onCheck(raw) {
  const text = raw.trim();
  if (!text || state.busy) return;
  const result = checkAnswer(state.problem, text);
  if (result.status === "unparsed") {
    addMsg("student", text);
    addMsg("tutor", `I couldn't read that as an answer. Try a number like ${EX.number}, a fraction like ${EX.fraction}, or a ratio like ${EX.ratio}.\n\nIf you meant to ask me something, tap Ask Rung instead.`);
    return;
  }
  addMsg("student", text);
  $("answerInput").value = "";

  if (result.status === "correct") {
    addVerdict("good", "✓ Correct · checked by code");
    record(countsAsWin(state));
    const noHelp = state.rung === 0 && state.wrongCount === 0;
    addMsg("tutor", noHelp ? pick(PRAISE_FIRST) : pick(PRAISE_CLIMB));
    state.phase = "solved";
    renderControls();
    $("nextBtn").focus();
    return;
  }
  if (result.status === "simplify") {
    addVerdict("info", "Right idea · not in simplest form yet");
    addMsg("tutor", "That's equal to the right answer! Can you write it in simplest form? Look for a number that divides both parts.");
    return;
  }
  if (result.status === "format") {
    const msg = {
      needs_ratio: `This one asks for a ratio. Write it with two numbers, like ${EX.ratio}.`,
      needs_number: "This one needs a single number, not a ratio.",
      needs_percent: "Right idea! Now write it as a percent.",
    }[result.reason];
    addVerdict("info", "Check the form of your answer");
    addMsg("tutor", msg);
    return;
  }
  // wrong: climb one rung and get a targeted hint
  addVerdict("bad", "✗ Not quite · checked by code");
  state.wrongCount += 1;
  record(false);
  state.rung = Math.min(state.rung + 1, 4);
  await askTutor({ event: "wrong", studentAnswer: text, studentLine: `My answer: ${text}` });
}

async function onHint() {
  if (state.busy || state.rung >= 4) return;
  state.rung += 1;
  if (state.rung > MAX_RUNG_FOR_WIN) record(false); // the worked example or walkthrough means "not yet"
  const ASK_LINE = { 1: "Can I get a nudge?", 2: "Can I have a hint?", 3: "Can I see an example?", 4: "Can you walk me through it?" };
  const line = ASK_LINE[state.rung];
  addMsg("student", line);
  await askTutor({ event: "hint", studentLine: line });
}

async function onAsk() {
  const text = $("answerInput").value.trim();
  if (state.busy) return;
  if (!text) {
    $("answerInput").placeholder = "Type your question, then tap Ask Rung";
    $("answerInput").focus();
    return;
  }
  $("answerInput").value = "";
  addMsg("student", text);
  state.rung = Math.max(state.rung, 1); // a question gets at least Nudge-level help, which still allows a win
  await askTutor({ event: "message", message: text, studentLine: text });
}

async function askTutor({ event, studentAnswer, message, studentLine }) {
  state.busy = true;
  renderRungs();
  renderControls();
  const typing = addTyping();
  const rung = state.rung;
  if (rung === 3 && state.problem.example) {
    // the student is about to see this problem solved, so don't serve it later as a fresh question
    markExampleShown(state.progress, state.problem.example);
    saveProgress();
  }
  let reply;
  let note = "";
  try {
    const r = await fetch("/api/tutor", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ problemId: state.problem.id, rung, event, studentAnswer, message, history: state.history }),
    });
    const data = await r.json().catch(() => ({}));
    reply = data.reply;
    if (r.status === 429) note = "Rung is busy right now, so here's a quick hint while you wait.";
    if (!reply) throw new Error(data.error || `HTTP ${r.status}`);
  } catch {
    reply = fallbackReply(state.problem, rung, null);
    if (!note) note = "I couldn't reach the AI just now, so here's a built-in hint.";
  }
  typing.remove();
  if (note) addVerdict("info", note);
  addMsg("tutor", reply, { rung });
  state.history.push({ role: "student", text: studentLine }, { role: "tutor", text: reply });
  state.history = state.history.slice(-8);
  if (rung >= 4) state.phase = "walked";
  state.busy = false;
  renderControls();
  if (state.phase === "solving") $("answerInput").focus();
}

function onNext() {
  const current = state.problem;
  const next = state.phase === "walked" ? chooseSimilar(state.progress, current) : chooseNext(state.progress, [current.id]);
  showProblem(next);
}

function reset() {
  if (!confirm("Reset your skill map and start over?")) return;
  state.progress = newProgress();
  saveProgress();
  state.firstVisit = true;
  showProblem(chooseNext(state.progress));
}

// ---------- wire up
$("answerInput").placeholder = PLACEHOLDER;
$("answerForm").addEventListener("submit", (e) => { e.preventDefault(); onCheck($("answerInput").value); });
$("hintBtn").addEventListener("click", onHint);
$("askBtn").addEventListener("click", onAsk);
$("nextBtn").addEventListener("click", onNext);
$("resetBtn").addEventListener("click", reset);
$("resetBtn2").addEventListener("click", reset);
$("practiceBtn").addEventListener("click", () => {
  const least = [...PROBLEMS].sort((a, b) => (state.progress.seen[a.id] || 0) - (state.progress.seen[b.id] || 0))[0];
  showProblem(getProblem(least.id));
});
$("aboutBtn").addEventListener("click", () => $("about").showModal());

showProblem(chooseNext(state.progress));
