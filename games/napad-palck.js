/* ===========================================================
   NAPAD PALČK  (avtor zgodbe: Jakob)
   1D dvoboj dveh palčk (črtic) v šolskem zvezku. Streljata si
   drobne črtice; ko se dva izstrelka zaletita → POK in izničita.
   Vsak zadetek nasprotnika malo skrči. Ko se skrči v piko, izgubi.
   Ne moreš streljati non-stop: 3 naboji, nato naključen premor 2–3 s.
   Dodatki: močan naboj, dvoboj na 3 zmage, bonus zvezdica, AI težavnost.
   Poudarek je na zvokih.
   =========================================================== */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;
const laneY = Math.round(H * 0.52);

/* ---------- zvok (Web Audio — brez datotek) ---------- */
let audioCtx = null;
let muted = false;
function initAudio() {
  if (audioCtx) { if (audioCtx.state === "suspended") audioCtx.resume(); return; }
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; }
}
function beep(freq, dur, type = "square", vol = 0.2, slideTo = null) {
  if (!audioCtx || muted) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(audioCtx.destination);
  osc.start(t); osc.stop(t + dur + 0.02);
}
function noiseBurst(dur, vol = 0.2, slideType = "lowpass", f0 = 1800, f1 = 200) {
  if (!audioCtx || muted) return;
  const t = audioCtx.currentTime;
  const buf = audioCtx.createBuffer(1, Math.max(1, audioCtx.sampleRate * dur), audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource(); src.buffer = buf;
  const filt = audioCtx.createBiquadFilter(); filt.type = slideType;
  filt.frequency.setValueAtTime(f0, t);
  filt.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filt).connect(g).connect(audioCtx.destination);
  src.start(t);
}
function seq(notes, gap, type, vol) {
  notes.forEach((f, i) => setTimeout(() => beep(f, gap * 1.4, type, vol), i * gap * 1000));
}
const sfx = {
  shoot(side) { beep(side > 0 ? 760 : 680, 0.08, "square", 0.10, side > 0 ? 300 : 260); },  // pew
  charge()    { beep(160, 0.30, "sawtooth", 0.12, 520); },                                    // nabijanje
  shootBig(side) { beep(side > 0 ? 420 : 380, 0.16, "sawtooth", 0.16, 120); noiseBurst(0.08, 0.06); }, // težak strel
  pok()       { noiseBurst(0.16, 0.22, "bandpass", 1200, 300); beep(240, 0.10, "square", 0.12, 80); }, // izničenje
  hit()       { beep(520, 0.10, "square", 0.14, 90); noiseBurst(0.06, 0.06); },               // zadetek
  reload()    { seq([440, 660, 880], 0.05, "triangle", 0.10); },                              // naboji nazaj
  star()      { seq([784, 988, 1319, 1568], 0.06, "triangle", 0.16); },                       // bonus
  count()     { beep(600, 0.08, "square", 0.12); },
  go()        { beep(950, 0.18, "square", 0.16, 700); },
  roundWin()  { seq([523, 659, 784], 0.10, "triangle", 0.2); },
  win()       { seq([523, 659, 784, 1047, 1319], 0.14, "triangle", 0.22); },
};

/* ---------- besedila (SL / EN) ---------- */
const LANG = (typeof localStorage !== "undefined" && localStorage.getItem("azv-lang") === "en") ? "en" : "sl";
const GT = {
  sl: {
    introTitle: "NAPAD", introSub: "PALČK ➖",
    introL1: "1D dvoboj dveh palčk v šolskem zvezku.",
    introL2: "Streljaj črtice. Ko se dve zaletita → POK!",
    introL3: "Vsak zadetek skrči nasprotnika. Kdor se skrči v piko, izgubi.",
    introStart: "Pritisni PRESLEDNICO ali tapni za začetek",
    modeTitle: "Koliko igralcev?",
    modeHint: "Tipke ↑ ↓ in preslednica  •  ali tapni izbiro",
    modeNames: ["1 IGRALEC (proti programu)", "2 IGRALCA"],
    modeDescs: ["Ti (modri) proti računalniku", "Modri ⌨ A/Q  •  Rdeči ⌨ L/O"],
    selectTitle: "Izberi težavnost",
    selectHint: "Tipke ↑ ↓ in preslednica  •  ali tapni izbiro",
    diffNames: ["LAHKO", "SREDNJE", "TEŽKO"],
    diffDescs: ["Počasen, redko brani", "Hitrejši, včasih brani", "Hiter, brani in nabija!"],
    storyNext: "(tapni / preslednica za naprej)",
    story: [
      "V velikem šolskem zvezku živijo palčke — drobne črtice.",
      "Nekega dne sta se dve sprli, katera je daljša in pomembnejša.",
      "Modra na eni strani, rdeča na drugi — v bojni red!",
      "Streljata črtice - POK! Kdor se skrči v piko, izgubi. Začnimo!",
    ],
    ready: "PRIPRAVI SE...",
    go: "BOJ!",
    blue: "MODRI", red: "RDEČI", you: "TI", cpu: "RAČUNALNIK",
    ammoLabel: "naboji", reloading: "polnjenje…",
    bestOf: "na 3 zmage",
    pok: "POK!",
    roundBlue: "Modri dobi rundo!", roundRed: "Rdeči dobi rundo!",
    roundYou: "Dobil si rundo!", roundCpu: "Računalnik dobi rundo!",
    winBlue: "MODRI ZMAGA! 🎉", winRed: "RDEČI ZMAGA! 🎉",
    winYou: "ZMAGAL SI! 🎉", winCpu: "Računalnik je zmagal 💻",
    matchFoot: "Pritisni preslednico / tapni za novo igro",
    starGet: "+ naboji!",
  },
  en: {
    introTitle: "ATTACK OF", introSub: "THE DASHES ➖",
    introL1: "A 1D duel of two dashes in a school notebook.",
    introL2: "Shoot dashes. When two collide → POW!",
    introL3: "Every hit shrinks the rival. Dot = you lose.",
    introStart: "Press SPACE or tap to start",
    modeTitle: "How many players?",
    modeHint: "Keys ↑ ↓ and space  •  or tap to choose",
    modeNames: ["1 PLAYER (vs computer)", "2 PLAYERS"],
    modeDescs: ["You (blue) vs the computer", "Blue ⌨ A/Q  •  Red ⌨ L/O"],
    selectTitle: "Choose difficulty",
    selectHint: "Keys ↑ ↓ and space  •  or tap to choose",
    diffNames: ["EASY", "MEDIUM", "HARD"],
    diffDescs: ["Slow, rarely blocks", "Faster, sometimes blocks", "Fast, blocks and charges!"],
    storyNext: "(tap / space to continue)",
    story: [
      "In a big school notebook live the dashes — tiny lines.",
      "One day they argued over who is longer and more important.",
      "Blue on one side, red on the other — battle stations!",
      "They shoot dashes. POW! Shrink to a dot and you lose. Let's go!",
    ],
    ready: "GET READY...",
    go: "FIGHT!",
    blue: "BLUE", red: "RED", you: "YOU", cpu: "COMPUTER",
    ammoLabel: "ammo", reloading: "reloading…",
    bestOf: "first to 3",
    pok: "POW!",
    roundBlue: "Blue wins the round!", roundRed: "Red wins the round!",
    roundYou: "You won the round!", roundCpu: "Computer wins the round!",
    winBlue: "BLUE WINS! 🎉", winRed: "RED WINS! 🎉",
    winYou: "YOU WIN! 🎉", winCpu: "The computer won 💻",
    matchFoot: "Press space / tap for a new game",
    starGet: "+ ammo!",
  },
};
const G = GT[LANG];

/* ---------- stanje ---------- */
const STATE = { INTRO: "intro", MODE: "mode", DIFF: "diff", STORY: "story", READY: "ready", PLAY: "play", ROUND: "round", OVER: "over" };
let state = STATE.INTRO;
let storyPage = 0;
let modeIndex = 0;     // 0 = 1 igralec, 1 = 2 igralca
let twoPlayer = false;
let diffIndex = 0;

const WIN_ROUNDS = 3;
const FULL_LEN = 240, DOT_LEN = 14, BAR_W = 18;
const HIT_SHRINK = 26, HIT_SHRINK_BIG = 52;
const AMMO_MAX = 3;
const RELOAD_MIN = 120, RELOAD_MAX = 180;   // 2–3 s pri 60 fps
const CHARGE_FRAMES = 22;                    // koliko držati za močan naboj (dotik)
const STAR_MIN = 480, STAR_MAX = 780;        // razmik med bonus zvezdicami (8–13 s)
const STAR_LIFE = 360;                       // koliko časa zvezdica obstoji

/* AI nastavitve po težavnosti */
const AI = [
  { cdMin: 55, cdMax: 95, fire: 0.55, block: 0.30, big: 0.05, lead: 0.6 },
  { cdMin: 35, cdMax: 70, fire: 0.75, block: 0.55, big: 0.12, lead: 0.8 },
  { cdMin: 22, cdMax: 48, fire: 0.92, block: 0.80, big: 0.22, lead: 1.0 },
];

/* ---------- igralca (palčki) ---------- */
function makePlayer(side) {
  return {
    side,                       // -1 = levo (modri), +1 = desno... uporabljamo x
    x: side < 0 ? 70 : W - 70,
    dir: side < 0 ? 1 : -1,     // smer streljanja
    len: FULL_LEN,
    ammo: AMMO_MAX,
    reload: 0,                  // frame števec; >0 = se polni
    flash: 0,                   // utrip ob zadetku
    charge: 0,                  // koliko časa drži gumb (za močan naboj)
    holding: false,
    score: 0,
    color: side < 0 ? "#2f6fe0" : "#e23b3b",
    dark: side < 0 ? "#1b3f86" : "#8e2020",
  };
}
let p1 = makePlayer(-1);   // modri
let p2 = makePlayer(1);    // rdeči

let bullets = [];
let particles = [];
let floatTexts = [];
let star = null;           // bonus
let starTimer = 0;
let frame = 0;
let shake = 0;

/* AI */
let aiCd = 0;

/* prehodi (ready/round/over) */
let phaseTimer = 0;
let roundMsg = "";
let lastRoundWinner = null;
let matchWinner = null;

const END_DELAY = 2200;
let endAt = 0;

/* ---------- pomožno ---------- */
function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function burst(x, y, color, n, spd) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = (0.5 + Math.random()) * (spd || 3);
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 24 + Math.random() * 10, c: color });
  }
}
function floatText(x, y, text, c, size) { floatTexts.push({ x, y, text, c: c || "#333", size: size || 22, t: 40 }); }

/* ---------- streljanje ---------- */
function canShoot(p) { return state === STATE.PLAY && p.ammo > 0; }
function spendAmmo(p, n) {
  p.ammo -= n;
  if (p.ammo <= 0) { p.ammo = 0; p.reload = randInt(RELOAD_MIN, RELOAD_MAX); }
}
function fireNormal(p) {
  if (!canShoot(p)) return;
  spendAmmo(p, 1);
  bullets.push({ x: p.x + p.dir * (BAR_W / 2 + 6), y: laneY, vx: p.dir * 6.2, big: false, owner: p, r: 9, life: 400 });
  sfx.shoot(p.dir);
}
function fireBig(p) {
  if (state !== STATE.PLAY || p.ammo < 2) return;
  spendAmmo(p, 2);
  bullets.push({ x: p.x + p.dir * (BAR_W / 2 + 8), y: laneY, vx: p.dir * 5.0, big: true, pierce: 1, owner: p, r: 17, life: 400 });
  sfx.shootBig(p.dir);
  burst(p.x + p.dir * 20, laneY, p.color, 6, 2);
}

/* ---------- vnos: tipkovnica ---------- */
const keyHold = {};   // čas držanja za nabijanje (frame štetje ob tipki strela)
window.addEventListener("keydown", (e) => {
  initAudio();
  const k = e.key.toLowerCase();
  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
  if (e.repeat) return;
  menuKey(k);
  if (state === STATE.PLAY) {
    // strel (takoj) — modri: A / preslednica ; rdeči: L
    if (k === "a" || k === " ") fireNormal(p1);
    if (twoPlayer && k === "l") fireNormal(p2);
    // močan naboj — modri: Q ; rdeči: O
    if (k === "q") fireBig(p1);
    if (twoPlayer && k === "o") fireBig(p2);
  }
});

function menuKey(k) {
  if (state === STATE.INTRO) { if (k === " " || k === "enter") state = STATE.MODE; return; }
  if (state === STATE.MODE) {
    if (k === "arrowup" || k === "w" || k === "arrowdown" || k === "s") { modeIndex ^= 1; return; }
    if (k === "1") modeIndex = 0; if (k === "2") modeIndex = 1;
    if (k === " " || k === "enter") chooseMode();
    return;
  }
  if (state === STATE.DIFF) {
    if (k === "arrowup" || k === "w") { diffIndex = (diffIndex + 2) % 3; return; }
    if (k === "arrowdown" || k === "s") { diffIndex = (diffIndex + 1) % 3; return; }
    if (k === "1") diffIndex = 0; if (k === "2") diffIndex = 1; if (k === "3") diffIndex = 2;
    if (k === " " || k === "enter") { state = STATE.STORY; storyPage = 0; }
    return;
  }
  if (state === STATE.STORY && (k === " " || k === "enter")) {
    storyPage++; if (storyPage >= G.story.length) startMatch();
    return;
  }
  if (state === STATE.OVER && (k === " " || k === "enter")) { tryLeaveEnd(); return; }
}
function chooseMode() {
  twoPlayer = modeIndex === 1;
  if (twoPlayer) { state = STATE.STORY; storyPage = 0; }
  else state = STATE.DIFF;
}

/* ---------- vnos: dotik / miška (po platnu = samo meniji; med igro se strelja z gumbi) ---------- */
function menuTap(e) {
  const rect = canvas.getBoundingClientRect();
  const py = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) * (H / rect.height);
  if (state === STATE.INTRO) { state = STATE.MODE; return; }
  if (state === STATE.MODE) {
    const idx = Math.floor((py - 210) / 95);
    if (idx === 0 || idx === 1) { modeIndex = idx; chooseMode(); }
    return;
  }
  if (state === STATE.DIFF) {
    const idx = Math.floor((py - 200) / 95);
    if (idx >= 0 && idx < 3) { diffIndex = idx; state = STATE.STORY; storyPage = 0; }
    return;
  }
  if (state === STATE.STORY) { storyPage++; if (storyPage >= G.story.length) startMatch(); return; }
  if (state === STATE.OVER) { tryLeaveEnd(); return; }
}
function canvasTap(e) {
  e.preventDefault(); initAudio();
  if (state === STATE.PLAY) { fireNormal(p1); return; }   // namizje: klik/tap = strel modrega
  menuTap(e);
}
canvas.addEventListener("mousedown", canvasTap);
canvas.addEventListener("touchstart", (e) => { e.preventDefault(); initAudio(); if (state !== STATE.PLAY) menuTap(e); }, { passive: false });

/* ---------- zagon dvoboja / runde ---------- */
function startMatch() {
  p1.score = 0; p2.score = 0; matchWinner = null;
  startRound();
}
function startRound() {
  [p1, p2].forEach((p) => { p.len = FULL_LEN; p.ammo = AMMO_MAX; p.reload = 0; p.flash = 0; p.charge = 0; p.holding = false; });
  bullets = []; particles = []; star = null; starTimer = randInt(STAR_MIN, STAR_MAX);
  aiCd = randInt(40, 80);
  state = STATE.READY; phaseTimer = 110;
}
function resetToIntro() { state = STATE.INTRO; storyPage = 0; }
function tryLeaveEnd() { if (performance.now() - endAt < END_DELAY) return; resetToIntro(); }

/* ---------- AI (rdeči, le v 1P) ---------- */
function updateAI() {
  if (twoPlayer || state !== STATE.PLAY) return;
  const cfg = AI[diffIndex];
  if (aiCd > 0) { aiCd--; return; }
  if (p2.ammo <= 0) return;
  // ali prihaja nevaren izstrelek? (lasten = p1)
  let incoming = null, bestDx = 1e9;
  for (const b of bullets) {
    if (b.owner === p1) { const dx = p2.x - b.x; if (dx > 30 && dx < 360 && dx < bestDx) { bestDx = dx; incoming = b; } }
  }
  let acted = false;
  if (incoming && Math.random() < cfg.block) { fireNormal(p2); acted = true; }     // blokiraj
  else if (Math.random() < cfg.fire) {
    if (p2.ammo >= 2 && Math.random() < cfg.big) fireBig(p2); else fireNormal(p2);  // napadi
    acted = true;
  }
  if (acted) aiCd = randInt(cfg.cdMin, cfg.cdMax);
  else aiCd = randInt(10, 22);
}

/* ---------- posodobitev ---------- */
function hitPlayer(p, big) {
  p.len -= big ? HIT_SHRINK_BIG : HIT_SHRINK;
  p.flash = 12; shake = big ? 9 : 5; sfx.hit();
  burst(p.x, laneY, p.color, big ? 16 : 9, 3);
  floatText(p.x, laneY - 70, "−", p.dark, 28);
  if (p.len <= DOT_LEN) { p.len = DOT_LEN; endRound(p === p1 ? p2 : p1); }
}
function endRound(winner) {
  if (state !== STATE.PLAY) return;
  winner.score++;
  lastRoundWinner = winner;
  burst((p1.x + p2.x) / 2, laneY, winner.color, 26, 4);
  if (winner.score >= WIN_ROUNDS) {
    matchWinner = winner; state = STATE.OVER; endAt = performance.now(); sfx.win();
  } else {
    roundMsg = winner === p1
      ? (twoPlayer ? G.roundBlue : G.roundYou)
      : (twoPlayer ? G.roundRed : G.roundCpu);
    state = STATE.ROUND; phaseTimer = 100; sfx.roundWin();
  }
}

function update() {
  frame++;
  if (shake > 0) shake--;
  // utripi & polnjenje vedno tečejo
  [p1, p2].forEach((p) => {
    if (p.flash > 0) p.flash--;
    if (p.reload > 0) { p.reload--; if (p.reload === 0) { p.ammo = AMMO_MAX; sfx.reload(); } }
  });

  if (state === STATE.READY) {
    phaseTimer--;
    if (phaseTimer === 60) sfx.count();
    if (phaseTimer === 30) sfx.count();
    if (phaseTimer <= 0) { state = STATE.PLAY; sfx.go(); }
    return;
  }
  if (state === STATE.ROUND) {
    phaseTimer--;
    particles.forEach((pt) => { pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.05; pt.life--; });
    particles = particles.filter((pt) => pt.life > 0);
    if (phaseTimer <= 0) startRound();
    return;
  }
  if (state !== STATE.PLAY) {
    particles.forEach((pt) => { pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.05; pt.life--; });
    particles = particles.filter((pt) => pt.life > 0);
    return;
  }

  updateAI();

  /* bonus zvezdica */
  if (!star) { if (starTimer > 0) starTimer--; else { star = { x: W / 2, y: laneY, t: 0, life: STAR_LIFE }; } }
  else { star.t++; star.life--; if (star.life <= 0) { star = null; starTimer = randInt(STAR_MIN, STAR_MAX); } }

  /* izstrelki */
  bullets.forEach((b) => { b.x += b.vx; b.life--; });

  /* trk izstrelek vs izstrelek (nasprotna lastnika) */
  for (let i = 0; i < bullets.length; i++) {
    for (let j = i + 1; j < bullets.length; j++) {
      const a = bullets[i], b = bullets[j];
      if (!a.dead && !b.dead && a.owner !== b.owner && Math.abs(a.x - b.x) < a.r + b.r) {
        // močan naboj prebije navadnega
        if (a.big && !b.big && a.pierce > 0) { a.pierce--; b.dead = true; pok((a.x + b.x) / 2); }
        else if (b.big && !a.big && b.pierce > 0) { b.pierce--; a.dead = true; pok((a.x + b.x) / 2); }
        else { a.dead = true; b.dead = true; pok((a.x + b.x) / 2); }
      }
    }
  }

  /* izstrelek vs bonus zvezdica */
  if (star) {
    for (const b of bullets) {
      if (!b.dead && Math.abs(b.x - star.x) < b.r + 16) {
        b.owner.ammo = AMMO_MAX; b.owner.reload = 0;
        floatText(star.x, laneY - 80, G.starGet, "#d98a00", 22);
        burst(star.x, laneY, "#ffcf33", 22, 4); sfx.star();
        b.dead = true; star = null; starTimer = randInt(STAR_MIN, STAR_MAX); break;
      }
    }
  }

  /* izstrelek vs palčka */
  bullets.forEach((b) => {
    if (b.dead) return;
    const target = b.owner === p1 ? p2 : p1;
    const reached = b.owner === p1 ? (b.x >= target.x - BAR_W / 2) : (b.x <= target.x + BAR_W / 2);
    if (reached) { hitPlayer(target, b.big); b.dead = true; }
  });

  bullets = bullets.filter((b) => !b.dead && b.life > 0 && b.x > -30 && b.x < W + 30);

  /* delci / besedila */
  particles.forEach((pt) => { pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.05; pt.life--; });
  particles = particles.filter((pt) => pt.life > 0);
  floatTexts.forEach((t) => { t.y -= 0.7; t.t--; });
  floatTexts = floatTexts.filter((t) => t.t > 0);
}
function pok(x) {
  burst(x, laneY, "#ffae33", 16, 4); burst(x, laneY, "#fff", 8, 2);
  floatText(x, laneY - 36, G.pok, "#222", 26);
  shake = Math.max(shake, 4); sfx.pok();
}

/* ===========================================================
   IZRIS
   =========================================================== */
function drawPaper() {
  ctx.fillStyle = "#fbf7ec"; ctx.fillRect(0, 0, W, H);
  // vodoravne črte (zvezek)
  ctx.strokeStyle = "#cfe0f0"; ctx.lineWidth = 1;
  for (let y = 60; y < H; y += 34) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // rdeča robna črta
  ctx.strokeStyle = "rgba(226,59,59,0.45)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(48, 0); ctx.lineTo(48, H); ctx.stroke();
  // bojna proga (poudarjena)
  ctx.strokeStyle = "rgba(60,60,60,0.18)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, laneY); ctx.lineTo(W, laneY); ctx.stroke();
}
function drawStick(p) {
  const h = p.len, x = p.x;
  ctx.save();
  if (p.flash > 0 && Math.floor(frame / 2) % 2 === 0) ctx.globalAlpha = 0.5;
  // senca/odebeljeno telo
  ctx.fillStyle = p.color;
  roundRect(x - BAR_W / 2, laneY - h / 2, BAR_W, h, 8); ctx.fill();
  ctx.fillStyle = p.dark;
  roundRect(x - BAR_W / 2, laneY - h / 2, BAR_W, h, 8); ctx.lineWidth = 2; ctx.strokeStyle = p.dark; ctx.stroke();
  // oči (na vrhu, gledata proti nasprotniku)
  const ey = laneY - h / 2 + 14, ex = p.dir * 3;
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(x - 4 + ex, ey, 3.4, 0, Math.PI * 2); ctx.arc(x + 4 + ex, ey, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#111";
  ctx.beginPath(); ctx.arc(x - 4 + ex + p.dir, ey, 1.6, 0, Math.PI * 2); ctx.arc(x + 4 + ex + p.dir, ey, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // nabijanje (sij okrog palčke)
  if (p.charge > 0) {
    const t = p.charge / CHARGE_FRAMES;
    ctx.strokeStyle = "rgba(255,200,40," + (0.3 + 0.5 * t) + ")";
    ctx.lineWidth = 2 + 4 * t;
    roundRect(x - BAR_W / 2 - 4, laneY - h / 2 - 4, BAR_W + 8, h + 8, 10); ctx.stroke();
  }
  // ime/naboji pod palčko
}
function drawBullet(b) {
  ctx.save();
  ctx.translate(b.x, b.y);
  const len = b.big ? 26 : 16, th = b.big ? 9 : 5;
  if (b.big) { ctx.shadowColor = b.owner.color; ctx.shadowBlur = 10; }
  ctx.fillStyle = b.owner.color;
  roundRect(-len / 2, -th / 2, len, th, th / 2); ctx.fill();
  ctx.restore();
}
function drawStar(s) {
  const pop = 1 + 0.12 * Math.sin(s.t * 0.18);
  ctx.save(); ctx.translate(s.x, s.y); ctx.scale(pop, pop); ctx.rotate(Math.sin(s.t * 0.05) * 0.2);
  ctx.fillStyle = "#ffcf33"; ctx.strokeStyle = "#d98a00"; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
    const a2 = a + Math.PI / 5;
    ctx.lineTo(Math.cos(a) * 15, Math.sin(a) * 15);
    ctx.lineTo(Math.cos(a2) * 6.5, Math.sin(a2) * 6.5);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // blink, da opozori da poteče
  if (s.life < 90 && Math.floor(frame / 6) % 2 === 0) { ctx.globalAlpha = 0.4; ctx.fillStyle = "#fff"; ctx.fill(); }
  ctx.restore();
}
function drawParticles() {
  particles.forEach((p) => { ctx.globalAlpha = Math.max(0, p.life / 30); ctx.fillStyle = p.c; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); });
  ctx.globalAlpha = 1;
}
function drawFloatTexts() {
  floatTexts.forEach((t) => { ctx.globalAlpha = Math.min(1, t.t / 22); ctx.fillStyle = t.c; ctx.textAlign = "center"; ctx.font = `bold ${t.size}px "Baloo 2", sans-serif`; ctx.fillText(t.text, t.x, t.y); });
  ctx.globalAlpha = 1;
}
function drawAmmo(p) {
  const baseY = laneY + FULL_LEN / 2 + 26;
  const label = p === p1 ? (twoPlayer ? G.blue : G.you) : (twoPlayer ? G.red : G.cpu);
  ctx.textAlign = "center"; ctx.fillStyle = p.dark; ctx.font = 'bold 15px "Baloo 2", sans-serif';
  ctx.fillText(label, p.x, baseY - 26);
  // naboji
  for (let i = 0; i < AMMO_MAX; i++) {
    const cx = p.x - (AMMO_MAX - 1) * 9 + i * 18;
    ctx.fillStyle = i < p.ammo ? p.color : "rgba(0,0,0,0.15)";
    roundRect(cx - 7, baseY - 5, 14, 6, 3); ctx.fill();
  }
  if (p.reload > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.font = '12px "Baloo 2", sans-serif';
    ctx.fillText(G.reloading, p.x, baseY + 18);
  }
}
function drawScore() {
  ctx.textAlign = "center"; ctx.font = 'bold 30px "Baloo 2", sans-serif';
  ctx.fillStyle = p1.color; ctx.fillText(p1.score, W / 2 - 40, 44);
  ctx.fillStyle = "#888"; ctx.fillText(":", W / 2, 44);
  ctx.fillStyle = p2.color; ctx.fillText(p2.score, W / 2 + 40, 44);
  ctx.fillStyle = "#aaa"; ctx.font = '12px "Baloo 2", sans-serif';
  ctx.fillText(G.bestOf, W / 2, 60);
}

/* zasloni */
function roundRect(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function wrapText(text, x, y, maxW, lh) {
  const words = text.split(" "); let line = "", yy = y;
  words.forEach((w) => { const test = line + w + " "; if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line.trim(), x, yy); line = w + " "; yy += lh; } else line = test; });
  ctx.fillText(line.trim(), x, yy);
}
function drawIntro() {
  drawPaper();
  // dve palčki na desni strani (da ne prekrivata besedila)
  ctx.fillStyle = "#2f6fe0"; roundRect(W * 0.66 - 9, laneY - 90, 18, 180, 8); ctx.fill();
  ctx.fillStyle = "#e23b3b"; roundRect(W * 0.84 - 9, laneY - 70, 18, 140, 8); ctx.fill();
  ctx.fillStyle = "#1a1a1a"; ctx.textAlign = "left";
  ctx.font = 'bold 44px "Baloo 2", sans-serif'; ctx.fillText(G.introTitle, 56, 120);
  ctx.fillStyle = "#2f6fe0"; ctx.font = 'bold 40px "Baloo 2", sans-serif'; ctx.fillText(G.introSub, 56, 166);
  ctx.fillStyle = "#444"; ctx.font = '18px "Baloo 2", sans-serif';
  ctx.fillText(G.introL1, 56, 226); ctx.fillText(G.introL2, 56, 254); ctx.fillText(G.introL3, 56, 282);
  ctx.fillStyle = "#0a6cc2"; ctx.font = 'bold 22px "Baloo 2", sans-serif';
  ctx.textAlign = "center"; ctx.fillText(G.introStart, W / 2, H - 60 + 4 * Math.sin(frame * 0.1));
}
function listScreen(title, hint, names, descs, sel, count, topY) {
  drawPaper();
  ctx.fillStyle = "#1a1a1a"; ctx.textAlign = "center";
  ctx.font = 'bold 38px "Baloo 2", sans-serif'; ctx.fillText(title, W / 2, 120);
  ctx.font = '16px "Baloo 2", sans-serif'; ctx.fillStyle = "#666"; ctx.fillText(hint, W / 2, 156);
  const bw = 480, bh = 80, bx = (W - bw) / 2;
  for (let i = 0; i < count; i++) {
    const by = topY + i * 95; const s = i === sel;
    ctx.fillStyle = s ? "#e7f0ff" : "#fff"; ctx.strokeStyle = s ? "#2f6fe0" : "#333"; ctx.lineWidth = s ? 5 : 3;
    roundRect(bx, by, bw, bh, 14); ctx.fill(); ctx.stroke();
    ctx.textAlign = "left"; ctx.fillStyle = "#1a1a1a"; ctx.font = 'bold 24px "Baloo 2", sans-serif';
    ctx.fillText(names[i], bx + 24, by + 34);
    ctx.fillStyle = "#555"; ctx.font = '15px "Baloo 2", sans-serif'; ctx.fillText(descs[i], bx + 24, by + 60);
  }
  ctx.textAlign = "center";
}
function drawStory() {
  drawPaper();
  const tw = W * 0.72, tx = (W - tw) / 2;
  ctx.fillStyle = "#fff"; ctx.strokeStyle = "#333"; ctx.lineWidth = 3;
  roundRect(tx, H / 2 - 110, tw, 200, 16); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#1a1a1a"; ctx.textAlign = "center"; ctx.font = '24px "Baloo 2", sans-serif';
  wrapText(G.story[storyPage], W / 2, H / 2 - 40, tw - 60, 34);
  ctx.fillStyle = "#0a6cc2"; ctx.font = 'bold 18px "Baloo 2", sans-serif';
  ctx.fillText(G.storyNext, W / 2, H / 2 + 70);
}
function drawArena() {
  drawPaper();
  if (star) drawStar(star);
  drawStick(p1); drawStick(p2);
  bullets.forEach(drawBullet);
  drawParticles();
  drawFloatTexts();
  drawScore();
  drawAmmo(p1); drawAmmo(p2);
}
function bigCenter(text, color, sub) {
  ctx.textAlign = "center";
  ctx.fillStyle = color; ctx.font = 'bold 56px "Baloo 2", sans-serif';
  ctx.fillText(text, W / 2, laneY - 6);
  if (sub) { ctx.fillStyle = "#444"; ctx.font = '20px "Baloo 2", sans-serif'; ctx.fillText(sub, W / 2, laneY + 30); }
}

function render() {
  if (state === STATE.INTRO) { drawIntro(); return; }
  if (state === STATE.MODE) { listScreen(G.modeTitle, G.modeHint, G.modeNames, G.modeDescs, modeIndex, 2, 210); return; }
  if (state === STATE.DIFF) { listScreen(G.selectTitle, G.selectHint, G.diffNames, G.diffDescs, diffIndex, 3, 200); return; }
  if (state === STATE.STORY) { drawStory(); return; }

  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  drawArena();
  if (state === STATE.READY) {
    const t = phaseTimer;
    bigCenter(t > 30 ? G.ready : G.go, t > 30 ? "#444" : "#1a9e3a");
  }
  if (state === STATE.ROUND) bigCenter(roundMsg, lastRoundWinner ? lastRoundWinner.color : "#444");
  ctx.restore();

  if (state === STATE.OVER) {
    ctx.fillStyle = "rgba(251,247,236,0.92)"; ctx.fillRect(0, 0, W, H);
    const msg = matchWinner === p1
      ? (twoPlayer ? G.winBlue : G.winYou)
      : (twoPlayer ? G.winRed : G.winCpu);
    ctx.textAlign = "center"; ctx.fillStyle = matchWinner ? matchWinner.color : "#222";
    ctx.font = 'bold 52px "Baloo 2", sans-serif'; ctx.fillText(msg, W / 2, H / 2 - 20);
    ctx.fillStyle = "#333"; ctx.font = 'bold 30px "Baloo 2", sans-serif';
    ctx.fillText(p1.score + " : " + p2.score, W / 2, H / 2 + 30);
    const left = Math.max(0, END_DELAY - (performance.now() - endAt));
    ctx.fillStyle = "#0a6cc2"; ctx.font = 'bold 20px "Baloo 2", sans-serif';
    const foot = left > 0 ? (LANG === "en" ? "Wait " : "Počakaj ") + Math.ceil(left / 1000) + " …" : G.matchFoot;
    ctx.fillText(foot, W / 2, H / 2 + 80 + 4 * Math.sin(frame * 0.1));
  }
}

/* ---------- mobilni gumbi: P1 spodaj levo, P2 spodaj desno (samo na dotik napravah) ---------- */
let leftPadEl = null, rightPadEl = null;
(function setupMobile() {
  const stage = document.getElementById("stage");
  if (!stage) return;

  // skrij privzeti joystick in kotne gumbe iz page.js (ne registriramo azvRegisterControls)
  [".joystick", ".game-controls"].forEach((sel) => { const el = document.querySelector(sel); if (el) el.style.display = "none"; });

  // CSS za naše gumbe
  const css = document.createElement("style");
  css.textContent =
    ".np-pad{position:absolute;bottom:16px;display:none;flex-direction:column;gap:12px;align-items:center;z-index:6;}" +
    ".np-pad.left{left:16px;}.np-pad.right{right:16px;}" +
    "@media (pointer: coarse){.np-pad.show{display:flex;}}" +
    ".np-btn{border:3px solid rgba(255,255,255,.92);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;" +
    "user-select:none;-webkit-user-select:none;touch-action:none;box-shadow:0 2px 6px rgba(0,0,0,.4);cursor:pointer;line-height:1;padding:0;}" +
    ".np-btn.fire{width:74px;height:74px;font-size:30px;}.np-btn.charge{width:54px;height:54px;font-size:22px;}" +
    ".np-btn.p1{background:rgba(47,111,224,.7);}.np-btn.p2{background:rgba(226,59,59,.65);}" +
    ".np-btn:active{transform:scale(.92);}";
  document.head.appendChild(css);

  function buildPad(sideClass, player) {
    const el = document.createElement("div");
    el.className = "np-pad " + sideClass;
    const charge = document.createElement("button");
    charge.type = "button"; charge.className = "np-btn charge " + (player === p1 ? "p1" : "p2"); charge.textContent = "💥";
    const fire = document.createElement("button");
    fire.type = "button"; fire.className = "np-btn fire " + (player === p1 ? "p1" : "p2"); fire.textContent = "➖";
    charge.addEventListener("pointerdown", (e) => { e.preventDefault(); initAudio(); if (state === STATE.PLAY) fireBig(player); });
    fire.addEventListener("pointerdown", (e) => { e.preventDefault(); initAudio(); if (state === STATE.PLAY) fireNormal(player); });
    el.appendChild(charge); el.appendChild(fire);
    return el;
  }

  leftPadEl = buildPad("left", p1);     // modri = 1. igralec
  rightPadEl = buildPad("right", p2);   // rdeči = 2. igralec
  stage.appendChild(leftPadEl);
  stage.appendChild(rightPadEl);
})();

let padStateKey = "";
function updatePads() {
  if (!leftPadEl) return;
  const playing = state === STATE.PLAY || state === STATE.READY || state === STATE.ROUND;
  const key = (playing ? "1" : "0") + (twoPlayer ? "1" : "0");
  if (key === padStateKey) return;   // posodobi DOM le ob spremembi (ne vsako sličico)
  padStateKey = key;
  leftPadEl.classList.toggle("show", playing);                 // P1 vedno (1P in 2P)
  rightPadEl.classList.toggle("show", playing && twoPlayer);   // P2 le pri dveh igralcih
}

/* ---------- zanka (fiksni časovni korak 60 Hz — hitrost neodvisna od osveževanja zaslona) ---------- */
const STEP_MS = 1000 / 60;
let lastTs = 0, accMs = 0;
function loop(now) {
  if (!lastTs) lastTs = now;
  accMs += now - lastTs;
  lastTs = now;
  if (accMs > 250) accMs = 250;                 // varovalo po zamrznitvi/zavihku v ozadju
  let steps = 0;
  while (accMs >= STEP_MS && steps < 5) { update(); accMs -= STEP_MS; steps++; }
  render();
  updatePads();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
