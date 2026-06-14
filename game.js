/* ===========================================================
   ELEKTRONI: STRAH V ROKAH
   Enostavna brskalniška igrica po stripu.
   Junaki: elektroni (prijazni "ruzijski hrčki") s strelami.
   Sovražniki: zlobni hrčki + veliki hrček s šestimi rokami.
   =========================================================== */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

/* ---------- zvok (Web Audio — brez datotek, deluje brez interneta) ---------- */
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
function noiseBurst(dur, vol = 0.2) {
  if (!audioCtx || muted) return;
  const t = audioCtx.currentTime;
  const buf = audioCtx.createBuffer(1, Math.max(1, audioCtx.sampleRate * dur), audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource(); src.buffer = buf;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(g).connect(audioCtx.destination);
  src.start(t);
}
function seq(notes, gap, type, vol) {
  notes.forEach((f, i) => setTimeout(() => beep(f, gap * 1.4, type, vol), i * gap * 1000));
}
const sfx = {
  shoot() { beep(900, 0.08, "square", 0.10, 240); },         // žvižg strele
  hit()   { beep(320, 0.05, "square", 0.08, 160); },          // udarec ob sovražnika
  shield(){ beep(500, 0.07, "sine", 0.08, 700); },            // odboj od ščita
  kill()  { beep(180, 0.18, "triangle", 0.18, 520); },        // sovražnik počil
  hurt()  { beep(200, 0.30, "sawtooth", 0.22, 60); noiseBurst(0.15, 0.08); }, // au!
  orb()   { beep(620, 0.12, "sine", 0.18, 1000); },           // pobereš elektriko
  life()  { seq([523, 659, 784, 1047], 0.09, "triangle", 0.2); }, // +1 življenje
  super() { noiseBurst(0.4, 0.22); beep(1200, 0.4, "sawtooth", 0.18, 200); }, // nevihta
  boss()  { beep(110, 0.6, "sawtooth", 0.22, 55); },          // veliki hrček
  win()   { seq([523, 659, 784, 1047, 1319], 0.14, "triangle", 0.22); },
  lose()  { seq([400, 330, 260, 180], 0.15, "sawtooth", 0.2); },
};

/* ---------- naloži strani stripa za uvodno zgodbo ---------- */
const stripPages = [];
for (let i = 1; i <= 4; i++) {
  const img = new Image();
  img.src = `assets/elektroni/page-${i}.webp`;
  stripPages.push(img);
}

/* ---------- stanje igre ---------- */
const STATE = { INTRO: "intro", SELECT: "select", STORY: "story", PLAY: "play", WIN: "win", LOSE: "lose" };
let state = STATE.INTRO;
let storyPage = 0;

/* ---------- težavnost ----------
   spawnBase/spawnMin: večja števila = MANJ sovražnikov
   enemyShoot*: večja števila = manj streljanja
   bossSpread: koliko blatnih krogel naenkrat (na vsako stran) */
const DIFFICULTIES = [
  { key: "lahko",   name: "LAHKO",   desc: "5 življenj, sovražniki padejo z 1 strelom",
    hp: 5, spawnBase: 240, spawnMin: 175, enemyShootMin: 300, enemyShootRnd: 180,
    evilHp: 1, poisonHp: 1, poisonChance: 0.12, enemySpeed: 0.55,
    bossHp: 30,  bossThreshold: 120, bossSpread: 1, bossShoot: 170 },
  { key: "srednje", name: "SREDNJE", desc: "3 življenja, več akcije",
    hp: 3, spawnBase: 115, spawnMin: 65,  enemyShootMin: 130, enemyShootRnd: 100,
    evilHp: 2, poisonHp: 2, poisonChance: 0.35, enemySpeed: 0.95,
    bossHp: 70,  bossThreshold: 200, bossSpread: 2, bossShoot: 90 },
  { key: "tezko",   name: "TEŽKO",   desc: "3 življenja, prava bitka!",
    hp: 3, spawnBase: 70,  spawnMin: 35,  enemyShootMin: 85,  enemyShootRnd: 70,
    evilHp: 3, poisonHp: 2, poisonChance: 0.5, enemySpeed: 1.3,
    bossHp: 110, bossThreshold: 260, bossSpread: 2, bossShoot: 60 },
];
let diffIndex = 0;                 // privzeto = LAHKO
let diff = DIFFICULTIES[diffIndex];

/* ---------- besedila igre (SL / EN) ----------
   Jezik prebere iz istega mesta kot ostala stran (preklop v glavi). */
const LANG = (typeof localStorage !== "undefined" && localStorage.getItem("azv-lang") === "en") ? "en" : "sl";
const GT = {
  sl: {
    introTitle: "ELEKTRONI", introSub: "strah v rokah",
    introL1: "Igrica po stripu — ti si elektron,",
    introL2: "prijazni ruzijski hrček s strelami! ⚡",
    introL3: "Premagaj zlobne hrčke in velikega hrčka.",
    introStart: "Pritisni PRESLEDNICO ali tapni za začetek",
    selectTitle: "Izberi težavnost",
    selectHint: "Tipke ↑ ↓ in preslednica  •  ali tapni izbiro",
    storyNext: "(tapni / preslednica za naprej)",
    hudFull: "SUPER MOČ POLNA — pritisni M!", hudElektrika: "Super moč",
    hudForLife: "Elektrika za življenje:", scoreLabel: "Točke: ",
    sndOn: "🔊 zvok: M", sndOff: "🔇 zvok: M",
    winTitle: "ZMAGA! 🎉",
    winLines: ["Boj je trajal in trajal...", "a za las so naši junaki ZMAGALI!", "Veliki hrček je premagan. ⚡"],
    winFoot: "Pritisni preslednico / tapni za novo igro",
    loseTitle: "KONEC 💔",
    loseLines: ["Zlobni hrčki so bili premočni...", "a elektroni se ne predajo!"],
    loseFoot: "Pritisni preslednico / tapni za nov poskus",
    diffNames: ["LAHKO", "SREDNJE", "TEŽKO"],
    diffDescs: ["5 življenj, sovražniki padejo z 1 strelom", "3 življenja, več akcije", "3 življenja, prava bitka!"],
    story: [
      "Pred tremi urami so se na sceni znašli trije zlobni hrčki...",
      "Veliki hrček je ukazal: »NAPAD!« — in zlobni hrčki so planili naprej.",
      "Tako so se zbudili stari ELEKTRONI — prijazni ruzijski hrčki s strelami!",
      "Začel se je veliki boj. Pomagaj elektronom zmagati za las!",
    ],
  },
  en: {
    introTitle: "ELECTRONS", introSub: "fear in their hands",
    introL1: "A game from the comic — you are an electron,",
    introL2: "a friendly hamster with lightning! ⚡",
    introL3: "Beat the evil hamsters and the big hamster.",
    introStart: "Press SPACE or tap to start",
    selectTitle: "Choose difficulty",
    selectHint: "Keys ↑ ↓ and space  •  or tap to choose",
    storyNext: "(tap / space to continue)",
    hudFull: "SUPER POWER READY — press M!", hudElektrika: "Super power",
    hudForLife: "Electricity for a life:", scoreLabel: "Score: ",
    sndOn: "🔊 sound: M", sndOff: "🔇 sound: M",
    winTitle: "VICTORY! 🎉",
    winLines: ["The battle went on and on...", "but by a hair our heroes WON!", "The big hamster is beaten. ⚡"],
    winFoot: "Press space / tap for a new game",
    loseTitle: "GAME OVER 💔",
    loseLines: ["The evil hamsters were too strong...", "but the electrons never give up!"],
    loseFoot: "Press space / tap to try again",
    diffNames: ["EASY", "MEDIUM", "HARD"],
    diffDescs: ["5 lives, enemies fall with 1 shot", "3 lives, more action", "3 lives, a real battle!"],
    story: [
      "Three hours ago, three evil hamsters showed up on the scene...",
      "The big hamster ordered: “ATTACK!” — and an evil hamster charged forward.",
      "So the old ELECTRONS awoke — friendly hamsters with lightning!",
      "The great battle began. Help the electrons win by a hair!",
    ],
  },
};
const G = GT[LANG];
const STORY = G.story;

/* ---------- igralec (elektron) ---------- */
const player = {
  x: 110, y: H / 2,
  r: 30,
  speed: 6,
  hp: 3,
  maxHp: 3,
  cooldown: 0,
  superCharge: 0,     // 0..100; super moč se postopno polni
  maxSuper: 100,
  invuln: 0,
  flap: 0,
};

/* ---------- seznami objektov ---------- */
let bolts = [];       // igralčeve strele
let enemies = [];     // zlobni hrčki
let eProjectiles = [];// sovražnikovi izstrelki (blato, črna energija, strup)
let orbs = [];        // elektrika za pobiranje
let particles = [];
let floatTexts = [];

let score = 0;
let orbCount = 0;            // pobrane elektrike; vsake 3 = +1 življenje
const ORBS_PER_LIFE = 3;
let spawnTimer = 0;
let orbTimer = 0;
let bossSpawned = false;
let boss = null;
let frame = 0;
let shake = 0;

/* ---------- vnos ---------- */
const keys = {};
window.addEventListener("keydown", (e) => {
  initAudio();
  const k = e.key.toLowerCase();
  keys[k] = true;
  if ([" ", "arrowup", "arrowdown"].includes(k)) e.preventDefault();
  handleAction(k);
});
window.addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });

function handleAction(k) {
  if (state === STATE.INTRO && (k === " " || k === "enter")) { state = STATE.SELECT; return; }
  if (state === STATE.SELECT) {
    if (k === "arrowup" || k === "w") { diffIndex = (diffIndex + DIFFICULTIES.length - 1) % DIFFICULTIES.length; return; }
    if (k === "arrowdown" || k === "s") { diffIndex = (diffIndex + 1) % DIFFICULTIES.length; return; }
    if (k === "1") { diffIndex = 0; }
    if (k === "2") { diffIndex = 1; }
    if (k === "3") { diffIndex = 2; }
    if (k === " " || k === "enter" || k === "1" || k === "2" || k === "3") {
      diff = DIFFICULTIES[diffIndex]; state = STATE.STORY; storyPage = 0; return;
    }
    return;
  }
  if (state === STATE.STORY && (k === " " || k === "enter")) {
    storyPage++;
    if (storyPage >= STORY.length) startGame();
    return;
  }
  if ((state === STATE.WIN || state === STATE.LOSE) && (k === " " || k === "enter")) { resetToIntro(); return; }
  if (state === STATE.PLAY && k === "m") trySuper();
}

/* ---------- dotik / miška ---------- */
let touchTargetY = null;
// Upravljanje s klikanjem/dotikom za premike velja samo na mobilnih (majhnih, dotik) zaslonih.
// Na velikih zaslonih bi nehoten klik miške drugače blokiral premike s tipkami.
function isMobileScreen() {
  return window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 820;
}
function canvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  const px = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  const py = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
  return { x: px * (W / rect.width), y: py * (H / rect.height) };
}
function pointerDown(e) {
  e.preventDefault();
  initAudio();
  if (state === STATE.INTRO) { state = STATE.SELECT; return; }
  if (state === STATE.SELECT) {
    const p = canvasPos(e);
    // tri vrstice gumbov, vsaka visoka ~90px, začnejo pri y=210
    const idx = Math.floor((p.y - 200) / 95);
    if (idx >= 0 && idx < DIFFICULTIES.length) {
      diffIndex = idx; diff = DIFFICULTIES[diffIndex]; state = STATE.STORY; storyPage = 0;
    }
    return;
  }
  if (state === STATE.STORY) { storyPage++; if (storyPage >= STORY.length) startGame(); return; }
  if (state === STATE.WIN || state === STATE.LOSE) { resetToIntro(); return; }
  if (state === STATE.PLAY) {
    // Premikanje s klikom/dotikom samo na mobilnih zaslonih; na velikih ostane le tipkovnica.
    if (isMobileScreen()) {
      const p = canvasPos(e);
      touchTargetY = p.y;
    }
    shoot();
  }
}
function pointerMove(e) {
  if (state === STATE.PLAY && e.touches && isMobileScreen()) { e.preventDefault(); touchTargetY = canvasPos(e).y; }
}
function pointerUp() { touchTargetY = null; }
canvas.addEventListener("mousedown", pointerDown);
canvas.addEventListener("touchstart", pointerDown, { passive: false });
canvas.addEventListener("touchmove", pointerMove, { passive: false });
canvas.addEventListener("touchend", pointerUp);

/* ---------- zagon ---------- */
function startGame() {
  state = STATE.PLAY;
  bolts = []; enemies = []; eProjectiles = []; orbs = []; particles = []; floatTexts = [];
  score = 0; orbCount = 0; spawnTimer = 0; orbTimer = 0; bossSpawned = false; boss = null; shake = 0;
  player.x = 110; player.y = H / 2; player.maxHp = diff.hp; player.hp = diff.hp; player.superCharge = 0;
  player.cooldown = 0; player.invuln = 60;
}
function resetToIntro() { state = STATE.INTRO; storyPage = 0; }

/* ---------- igralčeva strela ---------- */
function shoot() {
  if (player.cooldown > 0) return;
  player.cooldown = 11;
  bolts.push({ x: player.x + player.r, y: player.y, vx: 12, dmg: 2, t: 0 });
  addParticles(player.x + player.r, player.y, "#ffe14d", 4);
  sfx.shoot();
}

/* ---------- super moč: nevihta strel ---------- */
function trySuper() {
  if (player.superCharge < player.maxSuper) return;
  player.superCharge = 0;
  shake = 24;
  sfx.super();
  // udari vse na zaslonu
  enemies.forEach((en) => { en.hp -= 6; addParticles(en.x, en.y, "#ffe14d", 14); });
  if (boss) { boss.hp -= 14; addParticles(boss.x, boss.y, "#ffe14d", 30); }
  eProjectiles = [];
  enemies = enemies.filter((en) => { if (en.hp <= 0) { onEnemyKilled(en); return false; } return true; });
  floatTexts.push({ x: W / 2, y: H / 2, t: 60, text: "NEVIHTA STREL!", c: "#0a6cc2", size: 40 });
  for (let i = 0; i < 60; i++) addParticles(Math.random() * W, Math.random() * H, "#ffe14d", 1);
}

/* ---------- ustvarjanje sovražnikov ---------- */
function spawnEnemy() {
  const y = 70 + Math.random() * (H - 140);
  let type = "evil";
  if (Math.random() < diff.poisonChance) type = "poison";
  enemies.push({
    type, x: W + 40, y, r: 28,
    hp: type === "poison" ? diff.poisonHp : diff.evilHp,
    maxHp: type === "poison" ? diff.poisonHp : diff.evilHp,
    vx: -((0.9 + Math.random() * 0.8) * diff.enemySpeed),
    shoot: diff.enemyShootMin + Math.random() * diff.enemyShootRnd,
    shield: 0, shieldTimer: type === "evil" ? 120 + Math.random() * 120 : 99999,
    wobble: Math.random() * Math.PI * 2,
  });
}

function spawnBoss() {
  bossSpawned = true;
  boss = {
    x: W + 120, y: H / 2, r: 70,
    hp: diff.bossHp, maxHp: diff.bossHp,
    vx: -1.0, entering: true,
    shoot: 60, swing: 0, wobble: 0,
  };
  floatTexts.push({ x: W / 2, y: 90, t: 120, text: "VELIKI HRČEK!", c: "#7a2e8a", size: 38 });
  sfx.boss();
}

/* ---------- sovražnikovi izstrelki ---------- */
function enemyFire(en) {
  const ang = Math.atan2(player.y - en.y, player.x - en.x);
  const sp = 4;
  if (en.type === "poison") {
    eProjectiles.push({ x: en.x, y: en.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, kind: "strup", r: 9 });
  } else {
    eProjectiles.push({ x: en.x, y: en.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, kind: "crna", r: 11 });
  }
}

function bossFire() {
  // blato in blatne krogle iz ušes, v pahljači
  for (let i = -diff.bossSpread; i <= diff.bossSpread; i++) {
    const ang = Math.PI + i * 0.28;
    const sp = 3.5;
    eProjectiles.push({
      x: boss.x - 20, y: boss.y - 30,
      vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp + i * 0.3,
      kind: "blato", r: 13,
    });
  }
}

/* ---------- pomožno ---------- */
function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
function addParticles(x, y, c, n) {
  for (let i = 0; i < n; i++) {
    particles.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 20 + Math.random() * 15, c });
  }
}
function onEnemyKilled(en) {
  score += en.type === "poison" ? 15 : 10;
  addParticles(en.x, en.y, "#bbb", 12);
  sfx.kill();
  player.superCharge = Math.min(player.maxSuper, player.superCharge + 8);  // super se polni z uničevanjem
  if (Math.random() < 0.35) orbs.push({ x: en.x, y: en.y, vx: -1, r: 12, t: 0 });
}

function hurtPlayer(dmg) {
  if (player.invuln > 0) return;
  player.hp -= dmg;
  player.invuln = 70;
  shake = 14;
  addParticles(player.x, player.y, "#e23", 16);
  sfx.hurt();
  if (player.hp <= 0) { player.hp = 0; state = STATE.LOSE; sfx.lose(); }
}

/* ===========================================================
   POSODOBITEV
   =========================================================== */
function update() {
  frame++;
  if (state !== STATE.PLAY) return;

  if (player.cooldown > 0) player.cooldown--;
  if (player.invuln > 0) player.invuln--;
  if (shake > 0) shake--;
  player.flap += 0.3;

  /* premik igralca */
  if (keys["arrowup"] || keys["w"]) player.y -= player.speed;
  if (keys["arrowdown"] || keys["s"]) player.y += player.speed;
  if (touchTargetY !== null) {
    const dy = touchTargetY - player.y;
    if (Math.abs(dy) > 4) player.y += Math.sign(dy) * Math.min(player.speed, Math.abs(dy));
  }
  player.y = Math.max(player.r + 6, Math.min(H - player.r - 6, player.y));

  /* streljanje s tipko */
  if (keys[" "]) shoot();

  /* super moč se počasi polni, hitreje pa z uničevanjem sovražnikov */
  player.superCharge = Math.min(player.maxSuper, player.superCharge + 0.12);

  /* spawn */
  spawnTimer--;
  if (spawnTimer <= 0 && !bossSpawned) {
    spawnEnemy();
    spawnTimer = Math.max(diff.spawnMin, diff.spawnBase - score * 0.04);
  }
  orbTimer--;
  if (orbTimer <= 0) {
    orbs.push({ x: W + 20, y: 60 + Math.random() * (H - 120), vx: -2, r: 12, t: 0 });
    orbTimer = 220 + Math.random() * 160;
  }
  // boss po dovolj točkah
  if (!bossSpawned && score >= diff.bossThreshold) spawnBoss();

  /* strele */
  bolts.forEach((b) => { b.x += b.vx; b.t++; });
  bolts = bolts.filter((b) => b.x < W + 30);

  /* sovražniki */
  enemies.forEach((en) => {
    en.x += en.vx;
    en.wobble += 0.08;
    en.y += Math.sin(en.wobble) * 0.6;
    // ščit (samo navadni zlobni hrček)
    if (en.type === "evil") {
      en.shieldTimer--;
      if (en.shieldTimer <= 0) { en.shield = en.shield > 0 ? 0 : 90; en.shieldTimer = 140 + Math.random() * 120; }
      if (en.shield > 0) en.shield--;
    }
    en.shoot--;
    if (en.shoot <= 0 && en.x < W - 20) { enemyFire(en); en.shoot = diff.enemyShootMin + Math.random() * diff.enemyShootRnd; }
  });

  /* boss */
  if (boss) {
    if (boss.entering) { boss.x += boss.vx; if (boss.x <= W - 150) boss.entering = false; }
    else { boss.wobble += 0.04; boss.y = H / 2 + Math.sin(boss.wobble) * 140; }
    boss.swing += 0.1;
    boss.shoot--;
    if (boss.shoot <= 0) { bossFire(); boss.shoot = diff.bossShoot; }
  }

  /* sovražnikovi izstrelki */
  eProjectiles.forEach((p) => { p.x += p.vx; p.y += p.vy; });
  eProjectiles = eProjectiles.filter((p) => p.x > -30 && p.x < W + 30 && p.y > -30 && p.y < H + 30);

  /* elektrika za pobiranje */
  orbs.forEach((o) => { o.x += o.vx; o.t += 0.1; o.y += Math.sin(o.t) * 0.5; });
  orbs = orbs.filter((o) => o.x > -30);

  /* delci */
  particles.forEach((p) => { p.x += p.vx; p.y += p.vy; p.vx *= 0.92; p.vy *= 0.92; p.life--; });
  particles = particles.filter((p) => p.life > 0);
  floatTexts.forEach((t) => { t.t--; t.y -= 0.3; });
  floatTexts = floatTexts.filter((t) => t.t > 0);

  /* ---------- trki ---------- */
  // strele vs sovražniki
  bolts.forEach((b) => {
    enemies.forEach((en) => {
      if (b.dead) return;
      if (dist2(b.x, b.y, en.x, en.y) < (b.r ? b.r : 6 + en.r) ** 2 || dist2(b.x, b.y, en.x, en.y) < (en.r + 8) ** 2) {
        if (en.type === "evil" && en.shield > 0) {
          addParticles(b.x, b.y, "#7ab8ff", 5); b.dead = true; sfx.shield(); return;
        }
        en.hp -= b.dmg; b.dead = true;
        addParticles(b.x, b.y, "#ffe14d", 6);
        sfx.hit();
      }
    });
    // strele vs boss
    if (boss && !b.dead && dist2(b.x, b.y, boss.x, boss.y) < (boss.r + 6) ** 2) {
      boss.hp -= b.dmg; b.dead = true; addParticles(b.x, b.y, "#ffe14d", 8);
    }
  });
  bolts = bolts.filter((b) => !b.dead);
  enemies = enemies.filter((en) => { if (en.hp <= 0) { onEnemyKilled(en); return false; } return true; });

  // sovražnik doseže igralca
  enemies.forEach((en) => {
    if (en.x - en.r < player.x + player.r && dist2(en.x, en.y, player.x, player.y) < (en.r + player.r) ** 2) {
      hurtPlayer(1); en.hp = 0; addParticles(en.x, en.y, "#bbb", 10);
    }
    if (en.x < -40) { en.hp = 0; } // pobegnil mimo (brez kazni)
  });
  enemies = enemies.filter((en) => en.hp > 0);

  // izstrelki vs igralec
  eProjectiles.forEach((p) => {
    if (dist2(p.x, p.y, player.x, player.y) < (p.r + player.r - 6) ** 2) { p.dead = true; hurtPlayer(1); }
  });
  eProjectiles = eProjectiles.filter((p) => !p.dead);

  // elektrika vs igralec
  orbs.forEach((o) => {
    if (dist2(o.x, o.y, player.x, player.y) < (o.r + player.r) ** 2) {
      o.dead = true;
      addParticles(o.x, o.y, "#7ab8ff", 10);
      sfx.orb();
      orbCount++;
      if (orbCount >= ORBS_PER_LIFE) {
        orbCount = 0;
        if (player.hp < player.maxHp) {
          player.hp++;
          sfx.life();
          floatTexts.push({ x: player.x, y: player.y - 40, t: 70, text: "+1 ŽIVLJENJE!", c: "#e23b3b", size: 22 });
          addParticles(player.x, player.y, "#e23b3b", 18);
        } else {
          floatTexts.push({ x: o.x, y: o.y, t: 40, text: "+ELEKTRIKA", c: "#0a6cc2", size: 16 });
        }
      } else {
        floatTexts.push({ x: o.x, y: o.y, t: 40, text: "+ELEKTRIKA", c: "#0a6cc2", size: 16 });
      }
    }
  });
  orbs = orbs.filter((o) => !o.dead);

  // boss premagan
  if (boss && boss.hp <= 0) {
    addParticles(boss.x, boss.y, "#ffe14d", 60);
    score += 200; boss = null; state = STATE.WIN; sfx.win();
  }
}

/* ===========================================================
   RISANJE
   =========================================================== */
function clear() {
  ctx.fillStyle = "#fdfdf7";
  ctx.fillRect(0, 0, W, H);
  // karo papir
  ctx.strokeStyle = "rgba(120,150,180,0.18)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // rob beležke
  ctx.strokeStyle = "rgba(220,60,60,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(46, 0); ctx.lineTo(46, H); ctx.stroke();
}

function pencil() { ctx.strokeStyle = "#2b2b2b"; ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.lineCap = "round"; }

/* prijazni elektron (hrček) */
function drawElectron(x, y, r, flap, hurt) {
  ctx.save();
  ctx.translate(x, y);
  // aura, ko je super moč polna (pripravljena)
  if (player.superCharge >= player.maxSuper) {
    ctx.strokeStyle = `rgba(255,225,77,${0.4 + 0.3 * Math.sin(frame * 0.3)})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, r + 8, 0, Math.PI * 2); ctx.stroke();
  }
  pencil();
  if (hurt && Math.floor(frame / 4) % 2 === 0) ctx.globalAlpha = 0.4;
  // telo
  ctx.fillStyle = "#fff7c2";
  ctx.beginPath(); ctx.ellipse(0, 0, r, r * 1.05, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // ušesa
  const e = Math.sin(flap) * 2;
  ctx.beginPath(); ctx.ellipse(-r * 0.55, -r * 0.85 - e, 9, 12, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(r * 0.55, -r * 0.85 - e, 9, 12, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // oči
  ctx.fillStyle = "#2b2b2b";
  ctx.beginPath(); ctx.arc(-r * 0.32, -r * 0.1, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.32, -r * 0.1, 4, 0, Math.PI * 2); ctx.fill();
  // nasmeh
  ctx.beginPath(); ctx.arc(0, r * 0.15, 9, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
  // lička
  ctx.fillStyle = "rgba(255,150,150,0.5)";
  ctx.beginPath(); ctx.arc(-r * 0.55, r * 0.15, 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.55, r * 0.15, 5, 0, Math.PI * 2); ctx.fill();
  // strela na trebuhu (znak elektrona)
  ctx.strokeStyle = "#f5b500"; ctx.fillStyle = "#ffe14d"; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(2, r * 0.35); ctx.lineTo(-6, r * 0.62); ctx.lineTo(0, r * 0.62);
  ctx.lineTo(-4, r * 0.85); ctx.lineTo(8, r * 0.5); ctx.lineTo(2, r * 0.5); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

/* zlobni hrček */
function drawEvil(en) {
  ctx.save();
  ctx.translate(en.x, en.y);
  pencil();
  const col = en.type === "poison" ? "#d6f0c8" : "#e8e3da";
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.ellipse(0, 0, en.r, en.r, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // špičasta ušesa
  ctx.beginPath(); ctx.moveTo(-en.r * 0.5, -en.r * 0.7); ctx.lineTo(-en.r * 0.8, -en.r * 1.4); ctx.lineTo(-en.r * 0.15, -en.r * 0.85); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(en.r * 0.5, -en.r * 0.7); ctx.lineTo(en.r * 0.8, -en.r * 1.4); ctx.lineTo(en.r * 0.15, -en.r * 0.85); ctx.closePath(); ctx.fill(); ctx.stroke();
  // jezne oči
  ctx.strokeStyle = "#2b2b2b"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-en.r * 0.5, -en.r * 0.35); ctx.lineTo(-en.r * 0.1, -en.r * 0.1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(en.r * 0.5, -en.r * 0.35); ctx.lineTo(en.r * 0.1, -en.r * 0.1); ctx.stroke();
  ctx.fillStyle = "#2b2b2b";
  ctx.beginPath(); ctx.arc(-en.r * 0.28, -en.r * 0.05, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(en.r * 0.28, -en.r * 0.05, 3.5, 0, Math.PI * 2); ctx.fill();
  // namrgodena usta
  ctx.beginPath(); ctx.arc(0, en.r * 0.5, 8, 1.1 * Math.PI, 1.9 * Math.PI); ctx.stroke();
  // ščit
  if (en.type === "evil" && en.shield > 0) {
    ctx.strokeStyle = `rgba(60,120,255,${0.5 + 0.3 * Math.sin(frame * 0.3)})`;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, en.r + 10, -0.6 * Math.PI, 0.6 * Math.PI); ctx.stroke();
  }
  drawHpBar(0, -en.r - 16, en.r * 1.6, en.hp / en.maxHp);
  ctx.restore();
}

/* veliki hrček (boss) s šestimi rokami */
function drawBoss(b) {
  ctx.save();
  ctx.translate(b.x, b.y);
  pencil();
  // šest rok
  ctx.strokeStyle = "#7a2e8a"; ctx.lineWidth = 8; ctx.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const side = i < 3 ? -1 : 1;
    const k = i % 3;
    const a = Math.sin(b.swing + i) * 0.3;
    const baseY = (k - 1) * b.r * 0.6;
    ctx.beginPath();
    ctx.moveTo(side * b.r * 0.6, baseY);
    ctx.lineTo(side * (b.r * 1.2), baseY + Math.sin(a) * 30);
    ctx.lineTo(side * (b.r * 1.6), baseY + a * 40 + 20);
    ctx.stroke();
    ctx.fillStyle = "#7a2e8a";
    ctx.beginPath(); ctx.arc(side * (b.r * 1.6), baseY + a * 40 + 20, 9, 0, Math.PI * 2); ctx.fill();
  }
  // telo
  ctx.strokeStyle = "#2b2b2b"; ctx.lineWidth = 4;
  ctx.fillStyle = "#d8c4e0";
  ctx.beginPath(); ctx.ellipse(0, 0, b.r, b.r * 1.05, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // velika ušesa (iz njih leti blato)
  ctx.fillStyle = "#caa8d6";
  ctx.beginPath(); ctx.ellipse(-b.r * 0.7, -b.r * 0.8, 22, 30, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(b.r * 0.7, -b.r * 0.8, 22, 30, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // oči
  ctx.fillStyle = "#2b2b2b";
  ctx.beginPath(); ctx.arc(-b.r * 0.3, -b.r * 0.15, 8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(b.r * 0.3, -b.r * 0.15, 8, 0, Math.PI * 2); ctx.fill();
  // jezne obrvi
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-b.r * 0.55, -b.r * 0.5); ctx.lineTo(-b.r * 0.1, -b.r * 0.25); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(b.r * 0.55, -b.r * 0.5); ctx.lineTo(b.r * 0.1, -b.r * 0.25); ctx.stroke();
  // velika usta z zobmi
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.ellipse(0, b.r * 0.45, 26, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-14, b.r * 0.45 - 8); ctx.lineTo(-8, b.r * 0.45 + 6); ctx.lineTo(-2, b.r * 0.45 - 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6, b.r * 0.45 - 8); ctx.lineTo(12, b.r * 0.45 + 6); ctx.lineTo(18, b.r * 0.45 - 8); ctx.stroke();
  drawHpBar(0, -b.r - 26, b.r * 2, b.hp / b.maxHp, "#7a2e8a");
  ctx.restore();
}

function drawHpBar(x, y, w, frac, color = "#3aa33a") {
  ctx.save();
  ctx.translate(x - w / 2, y);
  ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(0, 0, w, 6);
  ctx.fillStyle = frac > 0.5 ? color : frac > 0.25 ? "#e0a000" : "#cc3030";
  ctx.fillRect(0, 0, Math.max(0, w * frac), 6);
  ctx.strokeStyle = "#2b2b2b"; ctx.lineWidth = 1; ctx.strokeRect(0, 0, w, 6);
  ctx.restore();
}

/* igralčeva strela (cikcak) */
function drawBolt(b) {
  ctx.save();
  ctx.strokeStyle = "#f5b500"; ctx.lineWidth = 4; ctx.lineCap = "round";
  ctx.shadowColor = "#ffe14d"; ctx.shadowBlur = 8;
  ctx.beginPath();
  let x = b.x - 18;
  ctx.moveTo(x, b.y);
  for (let i = 0; i < 3; i++) {
    ctx.lineTo(x + 6, b.y - 5); ctx.lineTo(x + 12, b.y + 5); x += 12;
  }
  ctx.lineTo(b.x + 4, b.y);
  ctx.stroke();
  ctx.restore();
}

function drawEProjectile(p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.kind === "blato") {
    ctx.fillStyle = "#7a5230"; ctx.strokeStyle = "#4a3018"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#5e3f24";
    ctx.beginPath(); ctx.arc(-3, -3, 3, 0, Math.PI * 2); ctx.fill();
  } else if (p.kind === "crna") {
    ctx.fillStyle = "#1a1a1a";
    ctx.shadowColor = "#6a2a8a"; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill();
  } else { // strup
    ctx.fillStyle = "#4caf2a"; ctx.strokeStyle = "#2e6a18"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath(); ctx.arc(-3, -3, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawOrb(o) {
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.strokeStyle = `rgba(120,180,255,${0.6 + 0.3 * Math.sin(frame * 0.2)})`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, o.r + 4, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#ffe14d"; ctx.strokeStyle = "#f5b500"; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(2, -o.r); ctx.lineTo(-6, 2); ctx.lineTo(0, 2);
  ctx.lineTo(-4, o.r); ctx.lineTo(8, -2); ctx.lineTo(2, -2); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  // srca
  for (let i = 0; i < player.maxHp; i++) {
    const hx = 20 + i * 30, hy = 24;
    ctx.fillStyle = i < player.hp ? "#e23b3b" : "rgba(0,0,0,0.15)";
    ctx.beginPath();
    ctx.moveTo(hx, hy + 6);
    ctx.bezierCurveTo(hx, hy, hx - 10, hy - 2, hx - 10, hy + 6);
    ctx.bezierCurveTo(hx - 10, hy + 12, hx, hy + 16, hx, hy + 20);
    ctx.bezierCurveTo(hx, hy + 16, hx + 10, hy + 12, hx + 10, hy + 6);
    ctx.bezierCurveTo(hx + 10, hy - 2, hx, hy, hx, hy + 6);
    ctx.fill();
  }
  // lestvica super moči (se polni)
  const bx = 20, by = 54, bw = 180, bh = 14;
  ctx.fillStyle = "rgba(0,0,0,0.1)"; ctx.fillRect(bx, by, bw, bh);
  const frac = player.superCharge / player.maxSuper;
  ctx.fillStyle = frac >= 1 ? "#ffd400" : "#ff9b3b";
  ctx.fillRect(bx, by, bw * frac, bh);
  ctx.strokeStyle = "#2b2b2b"; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = "#2b2b2b"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "left";
  ctx.fillText(frac >= 1 ? G.hudFull : G.hudElektrika, bx, by - 4);
  // napredek elektrik do +1 življenja
  const ly = by + bh + 16;
  ctx.font = "bold 14px sans-serif"; ctx.fillStyle = "#1a1a1a";
  ctx.fillText(G.hudForLife, bx, ly);
  for (let i = 0; i < ORBS_PER_LIFE; i++) {
    const cx = bx + 168 + i * 22;
    ctx.beginPath(); ctx.arc(cx, ly - 5, 8, 0, Math.PI * 2);
    ctx.fillStyle = i < orbCount ? "#ffd400" : "rgba(0,0,0,0.12)"; ctx.fill();
    ctx.strokeStyle = "#f5b500"; ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.fillStyle = "#e23b3b"; ctx.font = "16px sans-serif"; ctx.fillText("→ ♥", bx + 168 + ORBS_PER_LIFE * 22, ly);
  // točke
  ctx.textAlign = "right"; ctx.font = "bold 22px sans-serif"; ctx.fillStyle = "#1a1a1a";
  ctx.fillText(G.scoreLabel + score, W - 20, 34);
}

function drawParticles() {
  particles.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.life / 30);
    ctx.fillStyle = p.c;
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;
}
function drawFloatTexts() {
  floatTexts.forEach((t) => {
    ctx.globalAlpha = Math.min(1, t.t / 20);
    ctx.fillStyle = t.c; ctx.textAlign = "center";
    ctx.font = `bold ${t.size}px "Comic Sans MS", sans-serif`;
    ctx.fillText(t.text, t.x, t.y);
  });
  ctx.globalAlpha = 1;
}

/* zasloni */
function panel(title, lines, footer) {
  ctx.fillStyle = "rgba(253,253,247,0.92)";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#1a1a1a"; ctx.textAlign = "center";
  ctx.font = 'bold 40px "Comic Sans MS", sans-serif';
  ctx.fillText(title, W / 2, 130);
  ctx.font = '20px "Comic Sans MS", sans-serif';
  lines.forEach((l, i) => ctx.fillText(l, W / 2, 200 + i * 36));
  if (footer) {
    ctx.fillStyle = "#0a6cc2"; ctx.font = 'bold 22px "Comic Sans MS", sans-serif';
    ctx.fillText(footer, W / 2, H - 70 + 4 * Math.sin(frame * 0.1));
  }
}

function drawIntro() {
  clear();
  // pokaži stran stripa, če je naložena
  const img = stripPages[0];
  if (img.complete && img.naturalWidth) {
    const s = Math.min((H - 40) / img.naturalHeight, (W * 0.4) / img.naturalWidth);
    const iw = img.naturalWidth * s, ih = img.naturalHeight * s;
    ctx.drawImage(img, W - iw - 40, (H - ih) / 2, iw, ih);
  }
  ctx.fillStyle = "#1a1a1a"; ctx.textAlign = "left";
  ctx.font = 'bold 46px "Comic Sans MS", sans-serif';
  ctx.fillText(G.introTitle, 70, 160);
  ctx.font = 'bold 30px "Comic Sans MS", sans-serif';
  ctx.fillText(G.introSub, 70, 205);
  ctx.font = '18px "Comic Sans MS", sans-serif'; ctx.fillStyle = "#444";
  ctx.fillText(G.introL1, 70, 270);
  ctx.fillText(G.introL2, 70, 298);
  ctx.fillText(G.introL3, 70, 326);
  ctx.fillStyle = "#0a6cc2"; ctx.font = 'bold 22px "Comic Sans MS", sans-serif';
  ctx.fillText(G.introStart, 70, 410 + 4 * Math.sin(frame * 0.1));
}

function drawSelect() {
  clear();
  ctx.fillStyle = "#1a1a1a"; ctx.textAlign = "center";
  ctx.font = 'bold 40px "Comic Sans MS", sans-serif';
  ctx.fillText(G.selectTitle, W / 2, 130);
  ctx.font = '17px "Comic Sans MS", sans-serif'; ctx.fillStyle = "#555";
  ctx.fillText(G.selectHint, W / 2, 168);

  const bw = 460, bh = 80, bx = (W - bw) / 2;
  DIFFICULTIES.forEach((d, i) => {
    const by = 200 + i * 95;
    const sel = i === diffIndex;
    ctx.fillStyle = sel ? "#fff3c4" : "#fff";
    ctx.strokeStyle = sel ? "#0a6cc2" : "#2b2b2b";
    ctx.lineWidth = sel ? 5 : 3;
    roundRect(bx, by, bw, bh, 14); ctx.fill(); ctx.stroke();
    ctx.textAlign = "left";
    ctx.fillStyle = "#1a1a1a"; ctx.font = 'bold 28px "Comic Sans MS", sans-serif';
    ctx.fillText((i + 1) + ". " + G.diffNames[i], bx + 24, by + 36);
    ctx.fillStyle = "#555"; ctx.font = '16px "Comic Sans MS", sans-serif';
    ctx.fillText(G.diffDescs[i], bx + 24, by + 62);
    // mini srca
    ctx.fillStyle = "#e23b3b"; ctx.textAlign = "right"; ctx.font = '20px sans-serif';
    ctx.fillText("♥".repeat(d.hp), bx + bw - 20, by + 48);
  });
  ctx.textAlign = "center";
}

function drawStory() {
  clear();
  // V zgodbi igre se pokaže SAMO besedilo (strip se lista posebej v bralniku).
  const tw = W * 0.7, tx = (W - tw) / 2;
  ctx.fillStyle = "#fff"; ctx.strokeStyle = "#2b2b2b"; ctx.lineWidth = 3;
  roundRect(tx, H / 2 - 110, tw, 200, 16); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#1a1a1a"; ctx.textAlign = "center";
  ctx.font = '24px "Comic Sans MS", sans-serif';
  wrapText(STORY[storyPage], W / 2, H / 2 - 40, tw - 60, 34);
  ctx.fillStyle = "#0a6cc2"; ctx.font = 'bold 18px "Comic Sans MS", sans-serif';
  ctx.fillText(G.storyNext, W / 2, H / 2 + 70);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function wrapText(text, x, y, maxW, lh) {
  const words = text.split(" ");
  let line = "", yy = y;
  words.forEach((w) => {
    const test = line + w + " ";
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line.trim(), x, yy); line = w + " "; yy += lh; }
    else line = test;
  });
  ctx.fillText(line.trim(), x, yy);
}

/* ===========================================================
   GLAVNI RISALNI KLIC
   =========================================================== */
function render() {
  if (state === STATE.INTRO) { drawIntro(); return; }
  if (state === STATE.SELECT) { drawSelect(); return; }
  if (state === STATE.STORY) { drawStory(); return; }

  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  clear();

  orbs.forEach(drawOrb);
  enemies.forEach(drawEvil);
  if (boss) drawBoss(boss);
  eProjectiles.forEach(drawEProjectile);
  bolts.forEach(drawBolt);
  drawElectron(player.x, player.y, player.r, player.flap, player.invuln > 0);
  drawParticles();
  drawFloatTexts();
  ctx.restore();

  drawHUD();

  if (state === STATE.WIN) {
    panel(G.winTitle, G.winLines.concat([G.scoreLabel + score]), G.winFoot);
  }
  if (state === STATE.LOSE) {
    panel(G.loseTitle, G.loseLines.concat([G.scoreLabel + score]), G.loseFoot);
  }
}

/* ---------- zanka ---------- */
function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}
loop();
