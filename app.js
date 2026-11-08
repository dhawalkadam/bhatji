/* भटजी — hands-free Diwali pooja guide.
   Bhatji speaks (recorded clips in /audio, phone voice as fallback), shows only what matters,
   explains each mantra after it is recited, and listens for: झालं / पुन्हा / थांबा / चला / मागे. */
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
Object.assign(TDICT, {"माइक":"mic","माइकची":"micchi","माइकशिवाय":"mic-shivay","माइकने":"micne","परवानगी":"parvangi","प्रयत्न":"prayatna","आवाजाने":"aavajane","म्हणजे":"mhanje","म्हणून":"mhanun","म्हटलं":"mhatla","आपण":"aapan","सगळी":"sagli","सगळ्या":"saglya","त्यांचं":"tyancha","त्यांना":"tyanna","केलेलं":"kelela","घातलं":"ghatla","केलं":"kela","सांगणं":"sangna","लिहिणं":"lihina","होतं":"hota","कामं":"kama","नावं":"nava","तीर्थं":"tirtha","प्यायल्याने":"pyaylyane","ऐकू":"aiku","येतोय":"yetoy","मोठ्याने":"mothyane","बटण":"batan","सुरुवात":"suruvat","दाबा":"daba"});

/* text in the chosen script.  modes: both (Marathi leads) · both-en (English leads) · dev · rom */
function fmt(text, mr) {
  const r = tl(text, mr).replace(/\s*,\s*$/, "");
  switch (prefs.script) {
    case "dev": return `<span class="a">${esc(text)}</span>`;
    case "rom": return `<span class="a">${esc(r)}</span>`;
    case "both-en": return `<span class="a">${esc(r)}</span><span class="ro">${esc(text)}</span>`;
    default: return `<span class="a">${esc(text)}</span><span class="ro">${esc(r)}</span>`;
  }
}
const isEN = () => prefs.script === "rom" || prefs.script === "both-en";
/* one-line label in the leading script */
const L = mr => isEN() ? tl(mr, true) : mr;
function applyLabels() {
  document.querySelectorAll("[data-mr]").forEach(e => { e.textContent = isEN() ? e.dataset.en : e.dataset.mr; });
  document.body.classList.remove("s-dev", "s-rom", "s-both", "s-both-en"); document.body.classList.add("s-" + prefs.script);
}

/* ---------------- data ---------------- */
let C = null, MAN = {};
let day = null, nodes = [], idx = 0;
const WIN = { vasubaras:[12,24], dhanteras:[12,24], narak:[3,12], lakshmi:[12,24], padwa:[5,24], bhaubeej:[5,24] };
function windowOf(d) { const [a,b] = WIN[d.id] || [5,24]; const s = new Date(d.date + "T00:00:00"); return [new Date(+s + a*3600e3), new Date(+s + b*3600e3)]; }
function autoDay(now = new Date()) {
  for (const d of C.days) { const [a,b] = windowOf(d); if (now >= a && now < b) return { d, rel: "now" }; }
  for (const d of C.days) { const [a] = windowOf(d); if (now < a) return { d, rel: "next" }; }
  return { d: C.days[C.days.length - 1], rel: "past" };
}
function whenLabel(d) {
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((new Date(d.date + "T00:00:00") - today) / 864e5);
  const part = { dawn: "पहाटे", evening: "संध्याकाळी", morning: "सकाळी", day: "" }[d.part] || "";
  if (diff === 0) return ("आज " + part).trim();
  if (diff === 1) return ("उद्या " + part).trim();
  if (diff < 0) return "झालेली पूजा";
  return d.when;
}

/* ---------------- audio: recorded clips, phone voice as fallback ---------------- */
const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}   // play even when the phone is on silent (iOS 16.4+)
const el = new Audio(); el.preload = "auto"; el.setAttribute("playsinline", "");
let actx = null, analyser = null, ampRAF = 0, fakeAmp = false;
function setupAudioGraph() {
  if (IOS) return;   // routing through Web Audio would make iOS obey the silent switch
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
    if (!analyser) { const src = actx.createMediaElementSource(el); analyser = actx.createAnalyser(); analyser.fftSize = 512; src.connect(analyser); analyser.connect(actx.destination); }
  } catch (e) { analyser = null; }
}
const buf = new Uint8Array(256);
function ampLoop() {
  let a = 0;
  if (fakeAmp || (IOS && !el.paused)) a = 0.35 + 0.35 * Math.abs(Math.sin(performance.now() / 160));
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
  return ind.find(v => /male|rishi|hemant|ravi|madhur|manohar|kumar|prabhat|aarav/i.test(v.name) && !/female/i.test(v.name)) || ind.find(v => /^mr/i.test(v.lang)) || ind[0] || null;
}
function spokenOf(text) {
  const NUM = {"१९४८":"एकोणीसशे अठ्ठेचाळीस","५":"पाच","६":"सहा","७":"सात","८":"आठ","९":"नऊ","१०":"दहा"};
  return String(text).replace(/[०-९]+/g, m => NUM[m] || m).replace(/ॐ/g, "ओम").replace(/ः/g, "ह").replace(/ऽ/g, "")
    .replace(/्(?=[\s,.;!?।॥]|$)/g, "").replace(/[॥।.?!:;]/g, ",").replace(/[‘’"“”()\/]/g, "").replace(/·/g, ",").replace(/-/g, " ").replace(/\s*,[\s,]*/g, ", ").replace(/,\s*$/, "");
}
let tok = 0;
const alive = t => t === tok;
const sleep = (ms, t) => new Promise(r => setTimeout(() => r(t === undefined || t === tok), ms));
function stopSound() { try { el.pause(); } catch (e) {} try { hasTTS && speechSynthesis.cancel(); } catch (e) {} fakeAmp = false; document.body.classList.remove("speaking"); }
function speak(id, text, mantra, t) {
  return new Promise(resolve => {
    if (!alive(t)) return resolve(0);
    document.body.classList.add("speaking"); document.body.classList.remove("waiting");
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
    if (!hasTTS || !alive(t) || !pickVoice()) { setTimeout(resolve, Math.min(8000, 900 + String(text).length * 60)); return; }
    const parts = spokenOf(text).split(/(?<=,)\s+/).reduce((a, p) => { if (a.length && (a[a.length-1] + p).length < 120) a[a.length-1] += " " + p; else a.push(p); return a; }, []);
    let i = 0; fakeAmp = true;
    const next = () => {
      if (!alive(t) || i >= parts.length) { fakeAmp = false; resolve(); return; }
      const txt = parts[i++]; let fin = false;
      const u = new SpeechSynthesisUtterance(txt); const v = pickVoice(); u.voice = v; u.lang = v.lang;
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
let rec = null, micWanted = false, accepting = false, cmdResolve = null, lastCmdAt = 0;
let micMode = store.get("micMode2", "on");   // "on": try to listen in the background · "off": buttons only
let micHeard = false, micDenied = false;   // micHeard: Bhatji has actually understood you at least once this session
let onAnyHeard = null;
const RX = {
  next: /(झाल|झाले|जाल|जाले|हो गया|पुढे|पुढं|ओके|ठीक|\bzal|\bjhal|\bdone\b|\bnext\b|\bok(ay)?\b|^\s*हो\s*$|^\s*ho\s*$)/i,
  repeat: /(पुन्हा|परत|फिर से|दोबारा|\bpunha|\brepeat|\bagain)/i,
  pause: /(थांब|रुको|\bthamb|\bwait\b|\bstop\b|\bpause)/i,
  resume: /(चला|चलो|सुरू|शुरू|\bchala|\bcontinue|\bresume|\bstart)/i,
  back: /(मागे|मागच|पीछे|\bmage\b|\bback\b)/i
};
function classify(s) { for (const k of ["pause", "repeat", "back", "resume", "next"]) if (RX[k].test(s)) return k; return null; }
function startMic(onDenied) {
  if (!SR) return false;
  micWanted = true;
  if (!rec) {
    rec = new SR(); rec.lang = "mr-IN"; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 3;
    rec.onresult = e => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const tr = (e.results[i][0].transcript || "").trim();
        if (onAnyHeard && tr) { const f = onAnyHeard; onAnyHeard = null; f(tr); return; }
        if (!accepting) continue;
        for (let j = 0; j < e.results[i].length; j++) { const k = classify(e.results[i][j].transcript || ""); if (k) { micHeard = true; heard(); command(k, "voice"); return; } }
      }
    };
    rec.onerror = e => {
      if (e.error === "language-not-supported") { const L2 = ["mr-IN", "hi-IN", "en-IN"]; const i = L2.indexOf(rec.lang); if (i < L2.length - 1) rec.lang = L2[i + 1]; return; }
      if (e.error === "not-allowed" || e.error === "service-not-allowed") { micWanted = false; rec._denied = true; rec._onDenied && rec._onDenied(); }
    };
    rec.onend = () => { if (micWanted) setTimeout(() => { try { rec.start(); } catch (e) {} }, 300); };
  }
  rec._onDenied = onDenied;
  try { rec.start(); } catch (e) {}
  return true;
}
function stopMic() { micWanted = false; try { rec && rec.stop(); } catch (e) {} }
function heard() { document.body.classList.remove("heard"); void document.body.offsetWidth; document.body.classList.add("heard"); }
function micStatus() {
  const live = micMode === "on" && !micDenied && !!SR;
  document.body.classList.toggle("listening", accepting && live);
  $("#micTxt").textContent = isEN() ? "Listening — say ‘zala’ or tap" : "ऐकतोय — ‘झालं’ म्हणा किंवा बटण दाबा";
  const nt = $("#navNextTxt"); if (nt) nt.textContent = accepting ? (isEN() ? "Done" : "झालं") : (isEN() ? "Next" : "पुढे");
}
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
  if (src === "tap") { if (k === "next") partNext(); else if (k === "back") partBack(); else if (k === "repeat") partAgain(); }
}

/* ---------------- the rangoli: one more loop for every step ---------------- */
const SVGNS = "http://www.w3.org/2000/svg", KN = 5, KS = 40, KO = 30, KR = 20;
const RING = ["#F7C948", "#8CCB5E", "#5DB7F0"];   // turmeric · leaf green · sky blue powder
let kLoops = [], kFills = [], kDots = [], kNext = null;
function buildKolam() {
  const svg = $("#kolam"); svg.innerHTML = "";
  const mid = (KN - 1) / 2, cells = [];
  for (let r = 0; r < KN; r++) for (let c = 0; c < KN; c++) cells.push({ r, c, cx: KO + c * KS, cy: KO + r * KS, ring: Math.max(Math.abs(r - mid), Math.abs(c - mid)) });
  cells.sort((a, b) => a.ring - b.ring || Math.atan2(a.r - mid, a.c - mid) - Math.atan2(b.r - mid, b.c - mid));
  const gF = document.createElementNS(SVGNS, "g"), gD = document.createElementNS(SVGNS, "g"), gL = document.createElementNS(SVGNS, "g");
  svg.append(gF, gD, gL);
  const d = (cx, cy, R) => `M${cx} ${cy - R} Q${cx + R} ${cy - R} ${cx + R} ${cy} Q${cx + R} ${cy + R} ${cx} ${cy + R} Q${cx - R} ${cy + R} ${cx - R} ${cy} Q${cx - R} ${cy - R} ${cx} ${cy - R}Z`;
  kFills = cells.map(p => { const e = document.createElementNS(SVGNS, "path"); e.setAttribute("d", d(p.cx, p.cy, KR - 4)); e.setAttribute("fill", RING[p.ring % RING.length]); e.setAttribute("class", "fill"); gF.appendChild(e); return e; });
  kDots = cells.map(p => { const e = document.createElementNS(SVGNS, "circle"); e.setAttribute("cx", p.cx); e.setAttribute("cy", p.cy); e.setAttribute("r", "3"); e.setAttribute("class", "dot"); gD.appendChild(e); return e; });
  kLoops = cells.map(p => { const e = document.createElementNS(SVGNS, "path"); e.setAttribute("d", d(p.cx, p.cy, KR)); e.setAttribute("pathLength", "1"); e.setAttribute("class", "loop"); gL.appendChild(e); return e; });
  kNext = document.createElementNS(SVGNS, "path"); kNext.setAttribute("class", "next"); gL.appendChild(kNext);
  const c = KO + mid * KS;
  [[0,-9,"#E8546B"],[9,0,"#F4C64E"],[0,9,"#E8546B"],[-9,0,"#F4C64E"]].forEach(([x, y, col]) => { const e = document.createElementNS(SVGNS, "circle"); e.setAttribute("cx", c + x); e.setAttribute("cy", c + y); e.setAttribute("r", "4.5"); e.setAttribute("fill", col); e.setAttribute("class", "bloom"); svg.appendChild(e); });
}
function updateKolam(frac, complete) {
  if (!kLoops.length) return;
  const n = complete ? kLoops.length : Math.max(0, Math.min(kLoops.length, Math.round(frac * kLoops.length)));
  kLoops.forEach((e, i) => { e.classList.toggle("drawn", i < n); e.classList.toggle("newest", !complete && i === n - 1); });
  kFills.forEach((e, i) => e.classList.toggle("drawn", i < n));
  kDots.forEach((e, i) => e.classList.toggle("on", i < n));
  if (!complete && n < kLoops.length) { kNext.setAttribute("d", kLoops[n].getAttribute("d")); kNext.style.display = ""; } else kNext.style.display = "none";
  $("#kolam").classList.toggle("complete", !!complete);
}

/* ---------------- screens & sheets ---------------- */
function showScreen(id) {
  ["start", "check", "stage"].forEach(s => $("#" + s).hidden = s !== id);
  document.body.classList.toggle("on-start", id === "start");
  document.body.classList.toggle("on-check", id === "check");
  if (id !== "stage") document.body.classList.remove("listy");
}
let openSheet = null;
function sheet(id) { closeSheets(); openSheet = $(id); openSheet.classList.add("on"); $("#scrim").classList.add("on"); }
function closeSheets() { document.querySelectorAll(".sheet").forEach(s => s.classList.remove("on")); $("#scrim").classList.remove("on"); openSheet = null; }
$("#scrim").onclick = closeSheets;
let toastT = 0;
function toast(m) { let t = $(".toast"); if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); } t.textContent = m; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2600); }

const lineEl = $("#line"), instrEl = $("#instr"), youEl = $("#you"), listEl = $("#list");
function showInstr(text, explain) { lineEl.classList.remove("on", "rep"); lineEl.innerHTML = ""; instrEl.classList.toggle("explain", !!explain); instrEl.innerHTML = fmt(text, true); instrEl.classList.add("on"); }
function showLine(text, mr) { instrEl.classList.remove("on"); instrEl.innerHTML = ""; lineEl.classList.remove("on", "rep"); setTimeout(() => { lineEl.innerHTML = fmt(text, mr); lineEl.classList.add("on"); }, 140); }
function clearWords() { lineEl.classList.remove("on", "rep"); instrEl.classList.remove("on"); lineEl.innerHTML = ""; instrEl.innerHTML = ""; youEl.hidden = true; listEl.hidden = true; }
const DEVD = "०१२३४५६७८९";
const num = x => isEN() ? String(x) : String(x).replace(/\d/g, d => DEVD[d]);
function header() {
  const steps = nodes.filter(n => n.k === "step" || n.k === "sankalp");
  const n = nodes[idx]; const p = steps.indexOf(n);
  $("#title").textContent = L(n.title) + (p >= 0 ? `  ·  ${num(p + 1)}/${num(steps.length)}` : "");
  updateKolam(idx / (nodes.length - 1), n.k === "end");
}
function dayPillText() { $("#dayPillTxt").textContent = L(day.name); }

/* ---------------- the flow ---------------- */
let paused = false;
const phrase = k => C.phrases[k];
async function sayPhrase(k, t, explain) { const p = phrase(k); showInstr(p.text, explain); return speak(p.id, p.text, false, t); }

let pi = 0;   // which part of the step is playing: instruction, a mantra line, the meaning…
const isPart = it => (it.t === "say" && it.id !== phrase("repeat").id && it.id !== phrase("howto").id) || it.t === "line" || it.t === "you";
function go(i, part) {
  tok++; stopSound(); paused = false; document.body.classList.remove("paused");
  if (cmdResolve) cmdResolve("cancel");
  if (i >= nodes.length) i = nodes.length - 1;
  idx = Math.max(0, i); pi = part || 0;
  prog[day.id] = idx; store.set("prog", prog);
  runNode(tok, pi);
}
/* Back / Next / Again move one part at a time, then on into the neighbouring step */
function partNext() {
  if (cmdResolve) { cmdResolve("next"); return; }
  const items = nodes[idx].items;
  for (let k = pi + 1; k < items.length; k++) if (isPart(items[k]) || items[k].t === "wait" || items[k].t === "hold") return go(idx, k);
  go(idx + 1);
}
function partBack() {
  const items = nodes[idx].items;
  for (let k = pi - 1; k >= 0; k--) if (isPart(items[k])) return go(idx, k);
  if (idx === 0) return go(0);
  const prev = nodes[idx - 1].items; let last = 0;
  prev.forEach((it, k) => { if (isPart(it)) last = k; });
  go(idx - 1, last);
}
function partAgain() {
  const items = nodes[idx].items;
  if (items[pi] && items[pi].t === "hold") return go(idx, 0);
  if (items[pi] && items[pi].t === "wait") { const f = items.findIndex(it => it.t === "line"); return go(idx, f >= 0 ? f : 0); }
  go(idx, pi);
}
function renderSteps(ol) {
  const steps = nodes.map((n, i) => ({ n, i })).filter(x => x.n.k === "step" || x.n.k === "sankalp");
  ol.innerHTML = steps.map(x => `<li><button data-i="${x.i}" class="${x.i < idx ? "done" : x.i === idx ? "cur" : ""}">${esc(L(x.n.title))}</button></li>`).join("");
  ol.querySelectorAll("button").forEach(b => b.onclick = () => { closeSheets(); go(+b.dataset.i); });
}
async function runNode(t, start = 0) {
  const n = nodes[idx]; header(); clearWords();
  document.body.classList.toggle("listy", n.k === "samagri");
  document.body.classList.toggle("overview", n.k === "overview");
  $("#steps").hidden = n.k !== "overview"; if (n.k === "overview") renderSteps($("#steps"));
  if (n.k === "samagri") listEl.innerHTML = n.list.map(x => `<li>${esc(L(x))}</li>`).join("");
  let lastSay = "", sawLine = false;
  for (let k = 0; k < start; k++) { const it = n.items[k]; if (it.t === "say" && !it.explain && it.id !== phrase("repeat").id) lastSay = it.show || it.text; if (it.t === "line") sawLine = true; }
  for (let k = start; k < n.items.length; k++) {
    if (!alive(t)) return;
    pi = k; const it = n.items[k];
    if (it.t === "say") {
      if (it.id === phrase("howto").id) continue;
      if (!it.explain && it.id !== phrase("repeat").id) lastSay = it.show || it.text;
      if (n.k !== "overview") showInstr(it.show || it.text, it.explain); if (n.k === "samagri") listEl.hidden = false;
      await speak(it.id, it.text, false, t); if (!alive(t)) return;
      await sleep(it.explain ? 900 : 350, t);
    } else if (it.t === "line") {
      sawLine = true; showLine(it.text, !!it.mr);
      const dur = await speak(it.id, it.text, true, t); if (!alive(t)) return;
      lineEl.classList.add("rep"); document.body.classList.add("waiting");
      await sleep(Math.max(2000, dur * parseFloat(prefs.gap)), t); if (!alive(t)) return;
    } else if (it.t === "you") {
      clearWords();
      const g = (me.gotra || "").trim() || "काश्यप", nm = (me.name || "").trim() || "(तुमचे नाव)";
      const txt = `${g} गोत्रोत्पन्न${me.g === "f" ? "ा" : "ः"} ${nm} अहं,`;
      youEl.innerHTML = fmt(txt, false) + `<small>${isEN() ? "Say your gotra and name" : "गोत्र आणि नाव म्हणा"}</small>`; youEl.hidden = false;
      document.body.classList.add("waiting");
      await sleep(Math.max(4500, txt.length * 170), t); if (!alive(t)) return;
      youEl.hidden = true;
    } else if (it.t === "hold") {
      // e.g. the aarti: Bhatji waits until you say/tap ‘झालं’, then carries on with the shloka
      if (lastSay) showInstr(lastSay);
      const r = await waitCmd(Infinity, t);
      if (r === "cancel" || !alive(t)) return;
      if (r === "repeat") return go(idx, 0);
      if (r === "back") return partBack();
      continue;
    } else if (it.t === "auto") {
      await sleep(sawLine ? 1600 : 900, t); if (!alive(t)) return;
      return next(t);
    } else if (it.t === "wait") {
      if (lastSay && n.k !== "overview") showInstr(lastSay);
      if (n.k === "samagri") listEl.hidden = false;
      return awaitDone(it.secs || 30, t);
    }
  }
  if (n.k === "end") return finish(t);
  return next(t);
}
async function awaitDone(secs, t) {
  // Bhatji only moves on by himself once he has actually heard you; otherwise he waits for your tap
  let r = await waitCmd(micHeard ? secs * 1000 : Infinity, t);
  if (r === "timeout") {
    await sayPhrase("checkin", t); if (!alive(t)) return;
    r = await waitCmd(25000, t);
    if (r === "timeout") { await sayPhrase("moveon", t); if (!alive(t)) return; return next(t); }
  }
  if (r === "cancel" || !alive(t)) return;
  if (r === "repeat") return partAgain();
  if (r === "back") return partBack();
  return next(t);
}
async function next(t) { if (alive(t)) go(idx + 1); }
async function pause() {
  tok++; const t = tok; stopSound(); if (cmdResolve) cmdResolve("cancel");
  paused = true; document.body.classList.add("paused");
  await sayPhrase("paused", t); if (!alive(t)) return;
  const r = await waitCmd(Infinity, t); if (r === "cancel") return;
  paused = false; document.body.classList.remove("paused");
  await sayPhrase("resumed", t); if (!alive(t)) return;
  go(idx);
}
async function finish(t) {
  prog[day.id] = 0; store.set("prog", prog);
  clearWords(); showInstr("शुभ दीपावली");
  await sleep(9000, t); if (!alive(t)) return;
  exitSession();
}

/* ---------------- sound + mic check (before the first pooja) ---------------- */
function checkUI(icon, title, sub, btns, { tiles = false, help = "", live = false, ok = false } = {}) {
  $("#chkIcon").innerHTML = `<svg><use href="#${icon}"/></svg>`;
  $("#chkIcon").className = "bigicon" + (live ? " live" : "") + (ok ? " ok" : "");
  $("#chkTitle").innerHTML = esc(L(title)) + (sub ? `<small>${esc(L(sub))}</small>` : "");
  $("#chkTiles").hidden = !tiles;
  $("#chkHelp").hidden = !help; $("#chkHelpTxt").textContent = help;
  $("#chkBtns").innerHTML = "";
  btns.forEach(b => { const e = document.createElement("button"); e.className = b.ghost ? "ghost" : "primary"; e.textContent = L(b.l); e.onclick = b.f; $("#chkBtns").appendChild(e); });
}
let afterCheck = null;
function runCheck(then) {
  afterCheck = then; unlock(); if (!ampRAF) ampLoop();
  showScreen("check"); soundStep();
}
async function soundStep() {
  tok++; const t = tok;
  checkUI("i-speaker", "भटजींचा आवाज ऐकू येतोय?", "", [], { live: true });
  await speak(phrase("hear").id, phrase("hear").text, false, t); if (!alive(t)) return;
  checkUI("i-speaker", "भटजींचा आवाज ऐकू आला?", "", [
    { l: "हो, ऐकू आला", f: endCheck },
    { l: "नाही", ghost: true, f: () => {
      checkUI("i-speaker", "आवाज ऐकू येत नाही?", "हे तपासा, मग पुन्हा ऐका", [{ l: "पुन्हा ऐका", f: soundStep }], { tiles: true });
    } }
  ]);
}
function endCheck() {
  tok++; store.set("checkedAt", Date.now());
  const f = afterCheck; afterCheck = null;
  if (f) f(); else showStart();
}
const needsCheck = () => Date.now() - store.get("checkedAt", 0) > 12 * 3600e3;

/* ---------------- session start / stop ---------------- */
let wake = null;
async function keepAwake() { try { if ("wakeLock" in navigator) wake = await navigator.wakeLock.request("screen"); } catch (e) {} }
document.addEventListener("visibilitychange", () => { if (!document.hidden && !$("#stage").hidden) keepAwake(); });
const SILENT = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
let unlocked = false;
function unlock() {
  if (unlocked) return; unlocked = true;
  setupAudioGraph();
  try { el.src = SILENT; const p = el.play(); p && p.catch && p.catch(() => {}); } catch (e) {}
  if (hasTTS) { try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u); } catch (e) {} }
}
function begin(from) {
  if (needsCheck()) { runCheck(() => begin(from)); return; }
  unlock(); keepAwake(); if (!ampRAF) ampLoop();
  micHeard = false; micDenied = false;
  if (micMode === "on" && SR) startMic(() => { micDenied = true; micStatus(); toast(L("माइक बंद — खालची बटणे वापरा")); });
  nodes = day.nodes; showScreen("stage"); micStatus();
  go(from);
}
function exitSession() {
  tok++; stopSound(); stopMic(); accepting = false; if (cmdResolve) cmdResolve("cancel");
  try { wake && wake.release(); } catch (e) {} wake = null;
  showStart();
}

/* ---------------- start screen ---------------- */
function showStart() {
  showScreen("start"); updateKolam(1, true); applyLabels(); dayPillText();
  const a = autoDay();
  $("#stWhen").textContent = L(whenLabel(day));
  $("#stDay").textContent = L(day.name);
  $("#stSub").textContent = L(day.when);
  const p = prog[day.id] || 0, rb = $("#resumeBtn");
  if (p > 1 && p < day.nodes.length - 1) { rb.hidden = false; rb.textContent = L("पुढे सुरू करा — " + day.nodes[p].title); } else rb.hidden = true;
  $("#rowDaySub").textContent = L(day === a.d ? "आपोआप निवडला" : "तुम्ही निवडला");
  $("#rowMeSub").textContent = me.name ? (L(me.name) + " · " + L((me.gotra || "काश्यप") + " गोत्र")) : L("संकल्पात तुमचे नाव येईल");
  $("#rowCheckSub").textContent = L(needsCheck() ? "पूजेपूर्वी एकदा" : "तपासले आहे");
  $("#micSwitch").classList.toggle("on", micMode === "on");
  $("#rowMicSub").textContent = !SR ? L("या ब्राउझरमध्ये चालत नाही — बटणे वापरा") : L(micMode === "on" ? "‘झालं’ म्हणा, किंवा बटण दाबा" : "बंद — फक्त बटणे");
}
function pickDay(d) { day = d; store.set("day", { id: d.id, at: Date.now() }); if (!$("#stage").hidden) exitSession(); else showStart(); }
function openDays() {
  const a = autoDay();
  $("#dayList").innerHTML = C.days.map(d => `<button class="dayrow" data-id="${d.id}" aria-current="${d === day}"><span><span class="n">${esc(L(d.name))}</span><span class="d">${esc(L(d.when))}</span></span>${d === a.d ? `<span class="tag">${esc(L(a.rel === "now" ? "आज" : "पुढची"))}</span>` : ""}</button>`).join("");
  $("#dayList").querySelectorAll(".dayrow").forEach(b => b.onclick = () => { closeSheets(); pickDay(C.days.find(d => d.id === b.dataset.id)); });
  sheet("#daySheet");
}
$("#dayPill").onclick = openDays; $("#rowDay").onclick = openDays;
$("#rowMe").onclick = () => { syncSeg(); sheet("#meSheet"); };
$("#rowCheck").onclick = () => runCheck(null);
$("#rowMic").onclick = () => { micMode = micMode === "on" ? "off" : "on"; store.set("micMode2", micMode); showStart(); };
$("#meDone").onclick = () => { closeSheets(); showStart(); };
$("#goBtn").onclick = () => begin(0);
$("#resumeBtn").onclick = () => begin(prog[day.id] || 0);
$("#meName").value = me.name; $("#meGotra").value = me.gotra;
$("#meName").oninput = e => { me.name = e.target.value; store.set("me", me); };
$("#meGotra").oninput = e => { me.gotra = e.target.value; store.set("me", me); };
$("#meG").onclick = e => { const b = e.target.closest("button"); if (!b) return; me.g = b.dataset.v; store.set("me", me); syncSeg(); };
function syncSeg() {
  $("#meG").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === me.g)));
  $("#segGap").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === prefs.gap)));
  $("#scriptOpts").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === prefs.script)));
}
/* script switch — works mid-pooja too */
$("#scriptBtn").onclick = () => { syncSeg(); sheet("#scriptSheet"); };
$("#scriptOpts").onclick = e => {
  const b = e.target.closest("button"); if (!b) return;
  prefs.script = b.dataset.v; store.set("prefs", prefs); syncSeg(); applyLabels(); dayPillText();
  if (!$("#start").hidden) showStart();
  if (!$("#stage").hidden) { header(); micStatus(); if (lineEl.classList.contains("on") || instrEl.classList.contains("on")) refreshWords(); }
};
let lastShown = null;
function refreshWords() { if (lastShown) lastShown(); }
$("#segGap").onclick = e => { const b = e.target.closest("button"); if (!b) return; prefs.gap = b.dataset.v; store.set("prefs", prefs); syncSeg(); };
/* restart */
$("#restartBtn").onclick = () => sheet("#restartSheet");
$("#rsYes").onclick = () => { closeSheets(); if (!$("#stage").hidden) go(0); };
$("#rsHome").onclick = () => { closeSheets(); exitSession(); };
$("#rsNo").onclick = closeSheets;
$("#navNext").onclick = () => { lastCmdAt = 0; partNext(); };
$("#navBack").onclick = () => { lastCmdAt = 0; partBack(); };
$("#navRepeat").onclick = () => { lastCmdAt = 0; partAgain(); };
$("#title").onclick = () => { renderSteps($("#stepsSheetList")); sheet("#stepsSheet"); };
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && openSheet) { closeSheets(); return; }
  if ($("#stage").hidden || openSheet) return;
  if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight") { e.preventDefault(); partNext(); }
  else if (e.key === "r") partAgain();
  else if (e.key === "p") { lastCmdAt = 0; command(paused ? "resume" : "pause", "tap"); }
  else if (e.key === "ArrowLeft") partBack();
});

/* re-render the words on screen after a script change */
const _showInstr = showInstr, _showLine = showLine;
showInstr = (text, explain) => { lastShown = () => { instrEl.innerHTML = fmt(text, true); }; _showInstr(text, explain); };
showLine = (text, mr) => { lastShown = () => { lineEl.innerHTML = fmt(text, mr); }; _showLine(text, mr); };

/* ---------------- boot ---------------- */
(async () => {
  buildKolam(); applyLabels();
  try { C = await (await fetch("content.json", { cache: "no-cache" })).json(); }
  catch (e) { $("#stDay").textContent = "content.json लोड झाले नाही"; return; }
  try { const r = await fetch("audio/manifest.json", { cache: "no-cache" }); if (r.ok) MAN = await r.json(); } catch (e) { MAN = {}; }
  const saved = store.get("day", null), a = autoDay();
  day = (saved && Date.now() - saved.at < 6 * 3600e3 && C.days.find(d => d.id === saved.id)) || a.d;
  showStart();
})();
})();
