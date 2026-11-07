/* भटजी — hands-free Diwali pooja guide.
   Bhatji speaks (recorded clips in /audio, phone voice as fallback), shows only what matters,
   and listens for a few words: झालं / पुन्हा / थांबा / चला / मागे. */
"use strict";
(() => {
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem("bhatji:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("bhatji:" + k, JSON.stringify(v)); } catch (e) {} }
};
const prefs = Object.assign({ script: "both", gap: "1.4" }, store.get("prefs", {}));
const me = Object.assign({ name: "", gotra: "", g: "m" }, store.get("me", {}));
const prog = store.get("prog", {});

/* ---------------- transliteration (Devanagari → simple English letters) ---------------- */
const TV={"अ":"a","आ":"aa","इ":"i","ई":"i","उ":"u","ऊ":"u","ऋ":"ru","ए":"e","ऐ":"ai","ओ":"o","औ":"au","ऑ":"o","ॲ":"a"};
const TM={"ा":"a","ि":"i","ी":"i","ु":"u","ू":"u","ृ":"ru","े":"e","ै":"ai","ो":"o","ौ":"au","ॅ":"e","ॉ":"o"};
const TC={"क":"k","ख":"kh","ग":"g","घ":"gh","ङ":"n","च":"ch","छ":"chh","ज":"j","झ":"jh","ञ":"n","ट":"t","ठ":"th","ड":"d","ढ":"dh","ण":"n","त":"t","थ":"th","द":"d","ध":"dh","न":"n","प":"p","फ":"ph","ब":"b","भ":"bh","म":"m","य":"y","र":"r","ल":"l","ळ":"l","ऱ":"r","व":"v","श":"sh","ष":"sh","स":"s","ह":"h"};
const TDICT={"भटजी":"bhatji","तुमचा":"tumcha","तुमचं":"tumcha","तुमचे":"tumche","हरकत":"harkat","धनत्रयोदशी":"dhantrayodashi","करतो":"karto","करते":"karte","करतात":"kartat","सगळं":"sagla","सगळे":"sagle","सगळ्यांनी":"saglyanni","घरातल्या":"gharatlya","घरातली":"gharatli","घरातले":"gharatle","उजव्या":"ujvya","उदबत्ती":"udbatti","झालं":"zala","थोडं":"thoda","केलंत":"kelat","माहीत":"mahit","पाणी":"pani","हातातलं":"hatatla","ऐकायचं":"aikaycha","थांबायचं":"thambaycha","आजचं":"aajcha","नेहमीचं":"nehmicha","पूजेचं":"pujecha"};
const LAB="पफबभम", DIG="०१२३४५६७८९", SCH="\u0001";
function tlWord(w, mr) {
  if (mr && TDICT[w]) return TDICT[w];
  let o = "", i = 0, vow = 0, conj = false;
  while (i < w.length) {
    const c = w[i], n = w[i+1];
    if (c === "ज" && n === "्" && w[i+2] === "ञ") { o += "dny"; i += 3; if (TM[w[i]]) { o += TM[w[i]]; i++; vow++; } else if (w[i] === "्") i++; else { o += SCH; vow++; } continue; }
    if (TC[c]) {
      let k = TC[c]; if (mr && c === "झ") k = "z"; if (mr && c === "फ") k = "f";
      conj = w[i-1] === "्"; i++; if (w[i] === "़") i++;
      if (w[i] === "्") { o += k; i++; }
      else if (TM[w[i]]) { o += k + TM[w[i]]; i++; vow++; }
      else { o += k + SCH; vow++; }
      continue;
    }
    if (TV[c]) { o += TV[c]; vow++; i++; continue; }
    if (c === "ं" || c === "ँ") { const nx = w[i+1]; if (o.endsWith(SCH)) o = o.slice(0,-1) + "a"; if (nx && TC[nx]) o += LAB.includes(nx) ? "m" : "n"; else o += mr ? "" : "m"; i++; continue; }
    if (c === "ः") { if (o.endsWith(SCH)) o = o.slice(0,-1) + "a"; o += "h"; i++; continue; }
    if (c === "ॐ") { o += "Om"; vow++; i++; continue; }
    if (c === "ऽ") { i++; continue; }
    const di = DIG.indexOf(c); if (di >= 0) { o += di; i++; continue; }
    o += c; i++;
  }
  if (mr && vow > 1 && !conj && o.endsWith(SCH)) o = o.slice(0,-1);
  return o.split(SCH).join("a");
}
function tl(s, mr) {
  return String(s).replace(/॥/g, ".").replace(/।/g, ",").replace(/[ऀ-ॿ]+/g, w => tlWord(w, mr))
    .replace(/(^|[.!?]\s+|\n)([a-z])/g, (m, a, b) => a + b.toUpperCase());
}
/* text in the chosen script; mr=true for Marathi speech, false for Sanskrit mantras */
function fmt(text, mr) {
  if (prefs.script === "dev") return esc(text);
  if (prefs.script === "rom") return esc(tl(text, mr));
  return esc(text) + `<span class="ro">${esc(tl(text, mr))}</span>`;
}

/* ---------------- data ---------------- */
let C = null, MAN = {};
let day = null, nodes = [], idx = 0;

/* which pooja is now / next */
const WIN = { vasubaras:[12,24], dhanteras:[12,24], narak:[3,12], lakshmi:[12,24], padwa:[5,24], bhaubeej:[5,24] };
function windowOf(d) { const [a,b] = WIN[d.id] || [5,24]; const s = new Date(d.date + "T00:00:00"); return [new Date(+s + a*3600e3), new Date(+s + b*3600e3)]; }
function autoDay(now = new Date()) {
  for (const d of C.days) { const [a,b] = windowOf(d); if (now >= a && now < b) return { d, rel: "now" }; }
  for (const d of C.days) { const [a] = windowOf(d); if (now < a) return { d, rel: "next" }; }
  return { d: C.days[C.days.length - 1], rel: "past" };
}
function whenLabel(d) {
  const today = new Date(); today.setHours(0,0,0,0);
  const dd = new Date(d.date + "T00:00:00");
  const diff = Math.round((dd - today) / 864e5);
  const part = { dawn: "पहाटे", evening: "संध्याकाळी", morning: "सकाळी", day: "" }[d.part] || "";
  if (diff === 0) return ("आज " + part).trim();
  if (diff === 1) return ("उद्या " + part).trim();
  return d.when;
}

/* ---------------- audio: recorded clips, phone voice as fallback ---------------- */
const el = new Audio(); el.preload = "auto";
let actx = null, analyser = null, ampRAF = 0, fakeAmp = false;
function setupAudioGraph() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
    if (!analyser) {
      const src = actx.createMediaElementSource(el);
      analyser = actx.createAnalyser(); analyser.fftSize = 512;
      src.connect(analyser); analyser.connect(actx.destination);
    }
  } catch (e) { analyser = null; }
}
const buf = new Uint8Array(256);
function ampLoop() {
  let a = 0;
  if (fakeAmp) a = 0.35 + 0.35 * Math.abs(Math.sin(performance.now() / 160));
  else if (analyser && !el.paused) { analyser.getByteTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; s += v*v; } a = Math.min(1, Math.sqrt(s / buf.length) * 4); }
  document.documentElement.style.setProperty("--amp", a.toFixed(3));
  ampRAF = requestAnimationFrame(ampLoop);
}
const hasTTS = "speechSynthesis" in window;
let voices = [];
function loadVoices() { try { voices = speechSynthesis.getVoices() || []; } catch (e) { voices = []; } }
if (hasTTS) { loadVoices(); try { speechSynthesis.onvoiceschanged = loadVoices; } catch (e) {} }
function pickVoice() {
  const ind = voices.filter(v => /^(mr|hi)/i.test(v.lang));
  return ind.find(v => /male|rishi|hemant|ravi|madhur|manohar|kumar|prabhat|aarav|google.*(mr|hi).*(b|d)/i.test(v.name) && !/female/i.test(v.name))
      || ind.find(v => /^mr/i.test(v.lang)) || ind[0] || null;
}
function spokenOf(text) {
  const NUM = {"१९४८":"एकोणीसशे अठ्ठेचाळीस","५":"पाच","६":"सहा","७":"सात","८":"आठ","९":"नऊ","१०":"दहा"};
  return String(text).replace(/[०-९]+/g, m => NUM[m] || m).replace(/ॐ/g, "ओम").replace(/ः/g, "ह").replace(/ऽ/g, "")
    .replace(/्(?=[\s,.;!?।॥]|$)/g, "").replace(/[॥।.?!:;]/g, ",").replace(/[‘’"“”()\/]/g, "").replace(/·/g, ",").replace(/-/g, " ").replace(/\s*,[\s,]*/g, ", ").replace(/,\s*$/, "");
}
let tok = 0;
const alive = t => t === tok;
const sleep = (ms, t) => new Promise(r => setTimeout(() => r(t === undefined || t === tok), ms));
function stopSound() {
  try { el.pause(); } catch (e) {}
  try { hasTTS && speechSynthesis.cancel(); } catch (e) {}
  fakeAmp = false; document.body.classList.remove("speaking");
}
/* play one line; resolves with its duration in ms (0 if cancelled) */
function speak(id, text, mantra, t) {
  return new Promise(resolve => {
    if (!alive(t)) return resolve(0);
    document.body.classList.add("speaking"); document.body.classList.remove("waiting", "idle");
    const started = performance.now();
    const done = () => { fakeAmp = false; document.body.classList.remove("speaking"); resolve(alive(t) ? performance.now() - started : 0); };
    const file = id && MAN[id];
    if (file) {
      el.onended = done;
      el.onerror = () => { el.onended = el.onerror = null; tts(text, mantra, t).then(done); };
      el.src = "audio/" + file;
      const p = el.play(); if (p && p.catch) p.catch(() => { el.onended = el.onerror = null; tts(text, mantra, t).then(done); });
    } else tts(text, mantra, t).then(done);
  });
}
function tts(text, mantra, t) {
  return new Promise(resolve => {
    if (!hasTTS || !alive(t) || !pickVoice()) { setTimeout(resolve, Math.min(7000, 800 + String(text).length * 55)); return; }
    const parts = spokenOf(text).split(/(?<=,)\s+/).reduce((a, p) => { if (a.length && (a[a.length-1] + p).length < 120) a[a.length-1] += " " + p; else a.push(p); return a; }, []);
    let i = 0; fakeAmp = true;
    const next = () => {
      if (!alive(t) || i >= parts.length) { fakeAmp = false; resolve(); return; }
      const txt = parts[i++]; let fin = false;
      const u = new SpeechSynthesisUtterance(txt); const v = pickVoice();
      u.voice = v; u.lang = v.lang;
      u.rate = mantra ? 0.78 : 0.86; u.pitch = 0.72;
      const guard = setTimeout(() => { if (!fin) { fin = true; next(); } }, Math.max(3000, txt.length * 150));
      u.onend = u.onerror = () => { if (fin) return; fin = true; clearTimeout(guard); next(); };
      try { speechSynthesis.speak(u); } catch (e) { fin = true; clearTimeout(guard); next(); }
    };
    next();
  });
}

/* ---------------- listening ---------------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, micWanted = false, accepting = false, cmdResolve = null, lastCmdAt = 0, micOK = !!SR;
const RX = {
  next: /(झाल|झाले|जाल|जाले|हो गया|हो गये|पुढे|पुढं|पुढ़े|ओके|ठीक|\bzal|\bjhal|\bdone\b|\bnext\b|\bok(ay)?\b|^\s*हो\s*$|^\s*ho\s*$)/i,
  repeat: /(पुन्हा|परत|फिर से|दोबारा|\bpunha|\brepeat|\bagain)/i,
  pause: /(थांब|रुको|रुकिए|\bthamb|\bwait\b|\bstop\b|\bpause)/i,
  resume: /(चला|चलो|सुरू|शुरू|\bchala|\bcontinue|\bresume|\bstart)/i,
  back: /(मागे|मागच|पीछे|\bmage\b|\bback\b)/i
};
function classify(s) { for (const k of ["pause", "repeat", "back", "resume", "next"]) if (RX[k].test(s)) return k; return null; }
function startMic() {
  if (!SR) { micOK = false; micStatus(); return; }
  micWanted = true;
  if (!rec) {
    rec = new SR(); rec.lang = "mr-IN"; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 3;
    rec.onresult = e => {
      if (!accepting) return;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        for (let j = 0; j < e.results[i].length; j++) {
          const k = classify(e.results[i][j].transcript || "");
          if (k) { heard(); command(k, "voice"); return; }
        }
      }
    };
    rec.onspeechstart = () => { if (accepting) heard(); };
    rec.onerror = e => { if (e.error === "not-allowed" || e.error === "service-not-allowed") { micOK = false; micWanted = false; micStatus(); } };
    rec.onend = () => { if (micWanted) setTimeout(() => { try { rec.start(); } catch (e) {} }, 300); };
  }
  try { rec.start(); } catch (e) {}
  micStatus();
}
function stopMic() { micWanted = false; try { rec && rec.stop(); } catch (e) {} }
function heard() { document.body.classList.remove("heard"); void document.body.offsetWidth; document.body.classList.add("heard"); }
function micStatus() {
  const t = $("#micTxt");
  document.body.classList.toggle("listening", accepting && micOK);
  if (!micOK) t.textContent = "माइक बंद — भटजी आपोआप पुढे जातील · स्क्रीनला टॅप करा";
  else t.textContent = accepting ? "ऐकतोय… ‘झालं’ म्हणा" : "";
}
/* wait for a spoken (or tapped) command; resolves "next" | "repeat" | "back" | "pause" | "resume" | "timeout" */
function waitCmd(ms, t) {
  return new Promise(resolve => {
    accepting = true; micStatus(); document.body.classList.add("waiting");
    let timer = null;
    const fin = v => { clearTimeout(timer); accepting = false; cmdResolve = null; micStatus(); document.body.classList.remove("waiting"); resolve(alive(t) ? v : "cancel"); };
    cmdResolve = fin;
    if (isFinite(ms)) timer = setTimeout(() => fin("timeout"), ms);
  });
}
function command(k, src) {
  const now = performance.now(); if (now - lastCmdAt < 1200) return; lastCmdAt = now;
  if (k === "pause" && !paused) { pause(); return; }
  if (cmdResolve) { cmdResolve(k); return; }
  if (src === "tap") {          // taps work even while Bhatji is speaking
    if (k === "next") go(idx + 1);
    else if (k === "back") go(idx - 1);
    else if (k === "repeat") go(idx);
  }
}

/* ---------------- screen ---------------- */
const lineEl = $("#line"), instrEl = $("#instr"), meanEl = $("#mean"), youEl = $("#you"), listEl = $("#list");
function showInstr(text) { lineEl.classList.remove("on"); instrEl.innerHTML = fmt(text, true); instrEl.classList.add("on"); }
function showLine(text, mr) { instrEl.classList.remove("on"); lineEl.classList.remove("on"); setTimeout(() => { lineEl.innerHTML = fmt(text, mr); lineEl.classList.add("on"); }, 160); }
function clearWords() { lineEl.classList.remove("on"); instrEl.classList.remove("on"); meanEl.classList.remove("on"); youEl.hidden = true; listEl.hidden = true; }
function header() {
  const steps = nodes.filter(n => n.k === "step" || n.k === "sankalp");
  const n = nodes[idx]; const p = steps.indexOf(n);
  $("#title").textContent = n.title + (p >= 0 ? ` · ${p + 1}/${steps.length}` : "");
  if (prefs.script === "rom") $("#title").textContent = tl($("#title").textContent, true);
  $("#prog").style.width = (idx / (nodes.length - 1) * 100) + "%";
}

/* ---------------- the flow ---------------- */
const playedOnce = new Set();
let paused = false;
const R = ["r1", "r2", "r3", "r4", "r5"]; let lastR = -1;
function phrase(k) { return C.phrases[k]; }
async function sayPhrase(k, t) { const p = phrase(k); showInstr(p.text); return speak(p.id, p.text, false, t); }

function go(i) {
  tok++; stopSound(); paused = false; document.body.classList.remove("paused");
  if (cmdResolve) cmdResolve("cancel");
  idx = Math.max(0, Math.min(nodes.length - 1, i));
  prog[day.id] = idx; store.set("prog", prog);
  runNode(tok);
}
async function runNode(t) {
  const n = nodes[idx]; header(); clearWords();
  document.body.classList.toggle("listy", n.k === "samagri");
  if (n.k === "samagri") {
    listEl.innerHTML = n.list.map(x => `<li>${prefs.script === "rom" ? esc(tl(x, true)) : esc(x)}</li>`).join("");
  }
  let lastSay = "", sawLine = false;
  for (const it of n.items) {
    if (!alive(t)) return;
    if (it.t === "say") {
      if (it.once) { if (playedOnce.has(it.id)) continue; playedOnce.add(it.id); }
      if (it.id !== phrase("repeat").id) lastSay = it.show || it.text;
      showInstr(it.show || it.text); if (n.k === "samagri") listEl.hidden = false;
      await speak(it.id, it.text, false, t); if (!alive(t)) return;
      await sleep(350, t);
    } else if (it.t === "line") {
      sawLine = true; showLine(it.text, !!it.mr);
      const dur = await speak(it.id, it.text, true, t); if (!alive(t)) return;
      document.body.classList.add("waiting");
      await sleep(Math.max(2000, dur * parseFloat(prefs.gap)), t); if (!alive(t)) return;
    } else if (it.t === "you") {
      clearWords();
      const g = (me.gotra || "").trim() || "काश्यप", nm = (me.name || "").trim() || "(तुमचे नाव)";
      const txt = `${g} गोत्रोत्पन्न${me.g === "f" ? "ा" : "ः"} ${nm} अहं,`;
      youEl.innerHTML = fmt(txt, false) + `<small>${prefs.script === "rom" ? "Gotra ani nav mhana" : "गोत्र आणि नाव म्हणा"}</small>`; youEl.hidden = false;
      document.body.classList.add("waiting");
      await sleep(Math.max(4500, txt.length * 170), t); if (!alive(t)) return;
      youEl.hidden = true;
    } else if (it.t === "auto") {
      if (n.mean && sawLine) { meanEl.innerHTML = fmt(n.mean, true); meanEl.classList.add("on"); }
      await sleep(sawLine ? 2200 : 900, t); if (!alive(t)) return;
      return next(t, false);
    } else if (it.t === "wait") {
      if (lastSay) showInstr(lastSay);
      if (n.mean && sawLine) { meanEl.innerHTML = fmt(n.mean, true); meanEl.classList.add("on"); }
      if (n.k === "samagri") listEl.hidden = false;
      return awaitDone(it.secs || 30, t);
    }
  }
  if (n.k === "end") return finish(t);
  return next(t, false);
}
async function awaitDone(secs, t) {
  let r = await waitCmd(secs * 1000, t);
  if (r === "timeout") {
    await sayPhrase("checkin", t); if (!alive(t)) return;
    r = await waitCmd(25000, t);
    if (r === "timeout") { await sayPhrase("moveon", t); if (!alive(t)) return; return next(t, false); }
  }
  if (r === "cancel" || !alive(t)) return;
  if (r === "repeat") return go(idx);
  if (r === "back") return go(idx - 1);
  if (r === "resume") r = "next";
  return next(t, true);
}
async function next(t, praise) {
  if (!alive(t)) return;
  if (praise) { let i; do { i = Math.floor(Math.random() * R.length); } while (i === lastR); lastR = i; await sayPhrase(R[i], t); if (!alive(t)) return; await sleep(300, t); }
  if (!alive(t)) return;
  go(idx + 1);
}
async function pause() {
  tok++; const t = tok; stopSound(); if (cmdResolve) cmdResolve("cancel");
  paused = true; document.body.classList.add("paused");
  await sayPhrase("paused", t); if (!alive(t)) return;
  const r = await waitCmd(Infinity, t);
  if (r === "cancel") return;
  paused = false; document.body.classList.remove("paused");
  await sayPhrase("resumed", t + 0); // keep token: same session
  if (!alive(t)) return;
  go(idx);
}
async function finish(t) {
  prog[day.id] = 0; store.set("prog", prog);
  clearWords(); showInstr("शुभ दीपावली");
  document.body.classList.add("idle");
  await sleep(9000, t); if (!alive(t)) return;
  exitSession();
}

/* ---------------- session start / stop ---------------- */
let wake = null;
async function keepAwake() { try { if ("wakeLock" in navigator) wake = await navigator.wakeLock.request("screen"); } catch (e) {} }
document.addEventListener("visibilitychange", () => { if (!document.hidden && !$("#stage").hidden) keepAwake(); });
const SILENT = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
function unlock() {
  setupAudioGraph();
  try { el.src = SILENT; const p = el.play(); p && p.catch && p.catch(() => {}); } catch (e) {}
  if (hasTTS) { try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u); } catch (e) {} }
}
function begin(from) {
  unlock(); keepAwake(); startMic();
  if (!ampRAF) ampLoop();
  nodes = day.nodes;
  document.body.classList.remove("start-on", "idle");
  $("#start").hidden = true; $("#stage").hidden = false;
  go(from);
}
function exitSession() {
  tok++; stopSound(); stopMic(); accepting = false; if (cmdResolve) cmdResolve("cancel");
  try { wake && wake.release(); } catch (e) {} wake = null;
  $("#stage").hidden = true; $("#ctl").classList.remove("on");
  showStart();
}

/* ---------------- start screen ---------------- */
function showStart() {
  document.body.classList.add("start-on", "idle");
  $("#start").hidden = false;
  const a = autoDay();
  $("#stWhen").textContent = whenLabel(day);
  $("#stDay").textContent = day.name;
  $("#stSub").textContent = day === a.d ? day.when : day.when + " · तुम्ही निवडलेला दिवस";
  const p = prog[day.id] || 0, rb = $("#resumeBtn");
  if (p > 1 && p < day.nodes.length - 1) { rb.hidden = false; rb.textContent = `मागच्या वेळेपासून पुढे — ${day.nodes[p].title}`; }
  else rb.hidden = true;
  if (prefs.script === "rom") { $("#stDay").textContent = tl(day.name, true); }
  const have = Object.keys(MAN).length, total = new Set(C.days.flatMap(d => d.nodes.flatMap(n => n.items.filter(i => i.id).map(i => i.id)))).size;
  const v = pickVoice();
  $("#voiceHint").textContent = have ? `रेकॉर्ड केलेला भटजींचा आवाज: ${have}/${total} ओळी. बाकीच्या फोनच्या आवाजात.` : `अजून रेकॉर्डिंग नाही — फोनचा आवाज वापरला जाईल${v ? " (" + v.name + ")" : ""}.`;
  syncSeg();
}
function pickDay(d) { day = d; store.set("day", { id: d.id, at: Date.now() }); showStart(); }
function openDays() {
  const a = autoDay();
  $("#dayList").innerHTML = C.days.map(d => `<button class="dayrow" data-id="${d.id}"><span><span class="n">${esc(d.name)}</span><span class="d">${esc(d.when)}</span></span>${d === a.d ? `<span class="tag">${a.rel === "now" ? "आज" : "पुढची"}</span>` : ""}</button>`).join("");
  $("#dayList").querySelectorAll(".dayrow").forEach(b => b.onclick = () => { $("#daySheet").hidden = true; pickDay(C.days.find(d => d.id === b.dataset.id)); });
  $("#daySheet").hidden = false;
}
$("#daySheet").addEventListener("click", e => { if (e.target.id === "daySheet") $("#daySheet").hidden = true; });
$("#dayBtn").onclick = openDays;
$("#goBtn").onclick = () => begin(0);
$("#resumeBtn").onclick = () => begin(prog[day.id] || 0);
$("#meName").value = me.name; $("#meGotra").value = me.gotra;
$("#meName").oninput = e => { me.name = e.target.value; store.set("me", me); };
$("#meGotra").oninput = e => { me.gotra = e.target.value; store.set("me", me); };
function syncSeg() {
  $("#meG").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === me.g)));
  $("#segScript").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === prefs.script)));
  $("#segGap").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === prefs.gap)));
  document.body.classList.remove("s-dev", "s-rom", "s-both"); document.body.classList.add("s-" + prefs.script);
}
$("#meG").onclick = e => { const b = e.target.closest("button"); if (!b) return; me.g = b.dataset.v; store.set("me", me); syncSeg(); };
$("#segScript").onclick = e => { const b = e.target.closest("button"); if (!b) return; prefs.script = b.dataset.v; store.set("prefs", prefs); showStart(); };
$("#segGap").onclick = e => { const b = e.target.closest("button"); if (!b) return; prefs.gap = b.dataset.v; store.set("prefs", prefs); syncSeg(); };

/* ---------------- touch / keyboard fallback ---------------- */
let ctlTimer = 0;
$("#stage").addEventListener("click", () => { $("#ctl").classList.add("on"); clearTimeout(ctlTimer); ctlTimer = setTimeout(() => $("#ctl").classList.remove("on"), 5000); });
$("#cNext").onclick = () => command("next", "tap");
$("#cBack").onclick = () => { lastCmdAt = 0; command("back", "tap"); };
$("#cPause").onclick = () => { lastCmdAt = 0; if (paused) command("resume", "tap"); else command("pause", "tap"); };
$("#cExit").onclick = exitSession;
document.addEventListener("keydown", e => {
  if ($("#stage").hidden) return;
  if (e.key === " " || e.key === "Enter") { e.preventDefault(); command("next", "tap"); }
  else if (e.key === "r") command("repeat", "tap");
  else if (e.key === "p") { lastCmdAt = 0; command(paused ? "resume" : "pause", "tap"); }
  else if (e.key === "ArrowLeft") command("back", "tap");
  else if (e.key === "Escape") exitSession();
});

/* ---------------- boot ---------------- */
(async () => {
  try { C = await (await fetch("content.json", { cache: "no-cache" })).json(); }
  catch (e) { $("#stDay").textContent = "content.json लोड झाले नाही"; return; }
  try { const r = await fetch("audio/manifest.json", { cache: "no-cache" }); if (r.ok) MAN = await r.json(); } catch (e) { MAN = {}; }
  const saved = store.get("day", null), a = autoDay();
  day = (saved && Date.now() - saved.at < 6 * 3600e3 && C.days.find(d => d.id === saved.id)) || a.d;
  showStart();
})();
})();
