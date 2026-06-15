/* ===========================================================
   INVAZIJA ZOMBIJEV  (avtor zgodbe: Simon)
   Vsi ljudje so postali zombiji. Le en najstnik jih lahko reši.
   Skozi gozdni labirint se boriš z minigunom in kijem proti
   zombijevim glavam, na koncu pa z veliko zombijevo glavo z nogami.
   Pravo zdravilo pa je najlepša beseda na svetu — z njo na koncu
   ozdraviš vse zombije nazaj v ljudi.
   =========================================================== */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

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
  gun()   { beep(680, 0.05, "square", 0.07, 240); noiseBurst(0.04, 0.05); },   // minigun rat-tat
  club()  { noiseBurst(0.10, 0.12); beep(150, 0.12, "square", 0.10, 70); },    // zamah s kijem
  hit()   { beep(300, 0.05, "square", 0.08, 150); },
  heal()  { seq([523, 659, 784], 0.07, "triangle", 0.18); },                   // zombi ozdravljen
  hurt()  { beep(180, 0.30, "sawtooth", 0.22, 60); noiseBurst(0.15, 0.08); },
  heart() { seq([523, 659, 784, 1047], 0.09, "triangle", 0.2); },
  boss()  { beep(70, 0.7, "sawtooth", 0.22, 40); },
  win()   { seq([523, 659, 784, 1047, 1319], 0.14, "triangle", 0.22); },
  lose()  { seq([400, 330, 260, 180], 0.15, "sawtooth", 0.2); },
};

/* ---------- besedila (SL / EN) ---------- */
const LANG = (typeof localStorage !== "undefined" && localStorage.getItem("azv-lang") === "en") ? "en" : "sl";
const GT = {
  sl: {
    introTitle: "INVAZIJA", introSub: "ZOMBIJEV 🧟",
    introL1: "Vsi ljudje so postali zombiji.",
    introL2: "Le en najstnik jih lahko reši — to si ti!",
    introL3: "Bori se z minigunom in kijem skozi gozd.",
    introStart: "Pritisni PRESLEDNICO ali tapni za začetek",
    selectTitle: "Izberi težavnost",
    selectHint: "Tipke ↑ ↓ in preslednica  •  ali tapni izbiro",
    storyNext: "(tapni / preslednica za naprej)",
    hudScore: "Ozdravljeni: ", hudSlash: "KIJ", hudSlashReady: "KIJ pripravljen!",
    sndOn: "🔊 zvok", sndOff: "🔇 zvok",
    bossWarn: "POZOR — VELIKA ZOMBIJEVA GLAVA!",
    winTitle: "ZMAGA! 🎉",
    winLines: ["Rekel si najlepšo besedo na svetu...", "in vsi zombiji so spet postali ljudje! 🫂"],
    winFoot: "Pritisni preslednico / tapni za novo igro",
    loseTitle: "KONEC 💔",
    loseLines: ["Zombiji so te dohiteli...", "a najstnik se ne preda!"],
    loseFoot: "Pritisni preslednico / tapni za nov poskus",
    diffNames: ["LAHKO", "SREDNJE", "TEŽKO"],
    diffDescs: ["5 življenj, manj zombijev", "3 življenja, več akcije", "3 življenja, prava invazija!"],
    story: [
      "Vse se je začelo z eno samo zombijsko muho...",
      "Pičila je človeka — in invazija se je začela!",
      "Drug za drugim so vsi ljudje postali zombiji.",
      "Le en najstnik je ostal. Zdravilo? Najlepša beseda na svetu!",
    ],
  },
  en: {
    introTitle: "ZOMBIE", introSub: "INVASION 🧟",
    introL1: "Everyone turned into a zombie.",
    introL2: "Only one teenager can save them — that's you!",
    introL3: "Fight with a minigun and a club through the forest.",
    introStart: "Press SPACE or tap to start",
    selectTitle: "Choose difficulty",
    selectHint: "Keys ↑ ↓ and space  •  or tap to choose",
    storyNext: "(tap / space to continue)",
    hudScore: "Cured: ", hudSlash: "CLUB", hudSlashReady: "CLUB ready!",
    sndOn: "🔊 sound", sndOff: "🔇 sound",
    bossWarn: "WATCH OUT — GIANT ZOMBIE HEAD!",
    winTitle: "VICTORY! 🎉",
    winLines: ["You said the nicest word in the world...", "and all the zombies became people again! 🫂"],
    winFoot: "Press space / tap for a new game",
    loseTitle: "GAME OVER 💔",
    loseLines: ["The zombies caught up with you...", "but the teenager never gives up!"],
    loseFoot: "Press space / tap to try again",
    diffNames: ["EASY", "MEDIUM", "HARD"],
    diffDescs: ["5 lives, fewer zombies", "3 lives, more action", "3 lives, a real invasion!"],
    story: [
      "It all started with a single zombie fly...",
      "It bit a person — and the invasion began!",
      "One by one, everyone turned into a zombie.",
      "Only one teenager was left. The cure? The nicest word in the world!",
    ],
  },
};
const G = GT[LANG];

/* ---------- stanje ---------- */
const STATE = { INTRO: "intro", SELECT: "select", STORY: "story", PLAY: "play", WIN: "win", LOSE: "lose" };
let state = STATE.INTRO;
let storyPage = 0;

const DIFFICULTIES = [
  { hp: 5, spawnEvery: 110, maxEnemies: 4, enemySpeed: 0.80, enemyHp: 2, killsToBoss: 8,  bossHp: 28 },
  { hp: 3, spawnEvery: 80,  maxEnemies: 6, enemySpeed: 1.15, enemyHp: 3, killsToBoss: 12, bossHp: 46 },
  { hp: 3, spawnEvery: 55,  maxEnemies: 8, enemySpeed: 1.55, enemyHp: 3, killsToBoss: 15, bossHp: 64 },
];
let diffIndex = 0;
let diff = DIFFICULTIES[0];

/* ---------- gozdni labirint (drevesa) ---------- */
const walls = [
  { x: 150, y: 60,  w: 40, h: 150 },
  { x: 150, y: 340, w: 40, h: 140 },
  { x: 300, y: 0,   w: 40, h: 170 },
  { x: 300, y: 310, w: 40, h: 230 },
  { x: 450, y: 130, w: 40, h: 290 },
  { x: 600, y: 0,   w: 40, h: 190 },
  { x: 600, y: 330, w: 40, h: 210 },
  { x: 745, y: 140, w: 40, h: 270 },
];

/* ---------- meglice/zvezde v ozadju ---------- */
const stars = [];
for (let i = 0; i < 60; i++) {
  stars.push({ x: Math.random() * W, y: Math.random() * (H * 0.7), r: Math.random() * 1.5 + 0.4, ph: Math.random() * 6 });
}
/* ---------- oddaljena drevesa (silhuete) ---------- */
const bgTrees = [];
for (let i = 0; i < 14; i++) {
  bgTrees.push({ x: Math.random() * W, y: H * 0.55 + Math.random() * 40, s: 26 + Math.random() * 26 });
}

/* ---------- igralec (najstnik) ---------- */
const player = {
  x: 75, y: H / 2, r: 18, speed: 3.4,
  hp: 3, maxHp: 3,
  fx: 1, fy: 0,            // smer, v katero gleda / strelja
  cooldown: 0,            // minigun
  slashCd: 0,             // kij (sekundarna moč)
  slashTimer: 0,          // izris zamaha
  invuln: 0,
  step: 0,
};

/* ---------- seznami ---------- */
let bullets = [];      // izstrelki miniguna
let enemies = [];      // zombijeve glave
let hearts = [];       // srčki za pobrati
let particles = [];
let floatTexts = [];

let score = 0;         // ozdravljeni zombiji
let kills = 0;
let spawnTimer = 0;
let heartTimer = 0;
let boss = null;
let bossDefeated = false;
let bossWarn = 0;
let frame = 0;
let shake = 0;
const END_DELAY = 3000;   // ms: po koncu igre toliko časa ne moreš naprej (da se vidi zaslon)
let endAt = 0;
let endScreen = null;

/* ---------- vnos ---------- */
const keys = {};
window.addEventListener("keydown", (e) => {
  initAudio();
  const k = e.key.toLowerCase();
  keys[k] = true;
  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
  handleAction(k);
});
window.addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });

function handleAction(k) {
  if (state === STATE.INTRO) { if (k === " " || k === "enter") state = STATE.SELECT; return; }
  if (state === STATE.SELECT) {
    if (k === "arrowup" || k === "w") { diffIndex = (diffIndex + DIFFICULTIES.length - 1) % DIFFICULTIES.length; return; }
    if (k === "arrowdown" || k === "s") { diffIndex = (diffIndex + 1) % DIFFICULTIES.length; return; }
    if (k === "1") diffIndex = 0; if (k === "2") diffIndex = 1; if (k === "3") diffIndex = 2;
    if (k === " " || k === "enter") { diff = DIFFICULTIES[diffIndex]; state = STATE.STORY; storyPage = 0; }
    return;
  }
  if (state === STATE.STORY && (k === " " || k === "enter")) {
    storyPage++; if (storyPage >= G.story.length) startGame(); return;
  }
  if (state === STATE.WIN || state === STATE.LOSE) { if (k === " " || k === "enter") tryLeaveEnd(); return; }
  if (state === STATE.PLAY) {
    if (k === " ") shoot();
    if (k === "m") club();
  }
}

/* ---------- dotik / miška ---------- */
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
    const idx = Math.floor((p.y - 200) / 95);
    if (idx >= 0 && idx < DIFFICULTIES.length) { diffIndex = idx; diff = DIFFICULTIES[diffIndex]; state = STATE.STORY; storyPage = 0; }
    return;
  }
  if (state === STATE.STORY) { storyPage++; if (storyPage >= G.story.length) startGame(); return; }
  if (state === STATE.WIN || state === STATE.LOSE) { tryLeaveEnd(); return; }
  // med igro tapkanje po platnu ne sproži ničesar:
  // premik = joystick (spodaj levo), moči = gumba (spodaj desno).
}
function pointerMove() {}
function pointerUp() {}
canvas.addEventListener("mousedown", pointerDown);
canvas.addEventListener("touchstart", pointerDown, { passive: false });
canvas.addEventListener("touchmove", pointerMove, { passive: false });
canvas.addEventListener("touchend", pointerUp);

/* ---------- zagon / ponastavitev ---------- */
function startGame() {
  state = STATE.PLAY;
  bullets = []; enemies = []; hearts = []; particles = []; floatTexts = [];
  score = 0; kills = 0; spawnTimer = 0; heartTimer = 0;
  boss = null; bossDefeated = false; bossWarn = 0; frame = 0; shake = 0;
  player.x = 75; player.y = H / 2; player.hp = diff.hp; player.maxHp = diff.hp;
  player.fx = 1; player.fy = 0; player.cooldown = 0; player.slashCd = 0; player.slashTimer = 0; player.invuln = 0;
  endScreen = null;
}
function resetToIntro() { state = STATE.INTRO; storyPage = 0; }
function tryLeaveEnd() { if (performance.now() - endAt < END_DELAY) return; resetToIntro(); }

/* ---------- trki ---------- */
function hitsWall(cx, cy, r) {
  for (const w of walls) {
    const nx = Math.max(w.x, Math.min(cx, w.x + w.w));
    const ny = Math.max(w.y, Math.min(cy, w.y + w.h));
    if ((cx - nx) ** 2 + (cy - ny) ** 2 < r * r) return true;
  }
  return false;
}
function tryMove(obj, dx, dy) {
  const nx = obj.x + dx;
  if (nx > obj.r && nx < W - obj.r && !hitsWall(nx, obj.y, obj.r)) obj.x = nx;
  const ny = obj.y + dy;
  if (ny > obj.r && ny < H - obj.r && !hitsWall(obj.x, ny, obj.r)) obj.y = ny;
}
function inWallOrEdge(x, y, r) { return x < r || x > W - r || y < r || y > H - r || hitsWall(x, y, r); }

/* ---------- akcije ---------- */
function shoot() {
  if (player.cooldown > 0) return;
  player.cooldown = 6;   // minigun = hiter ogenj
  const spread = (Math.random() - 0.5) * 0.18;
  const ang = Math.atan2(player.fy, player.fx) + spread;
  const vx = Math.cos(ang), vy = Math.sin(ang);
  bullets.push({ x: player.x + player.fx * (player.r + 6), y: player.y + player.fy * (player.r + 6) - 4, vx: vx * 8.4, vy: vy * 8.4, r: 5, life: 80 });
  player.step += 0.6;
  sfx.gun();
}
function club() {
  if (player.slashCd > 0) return;
  player.slashCd = 95;     // ~1,6 s do naslednjega zamaha (močan, a počasen)
  player.slashTimer = 12;
  sfx.club();
  const reach = player.r + 46;   // večji doseg
  const targets = boss ? enemies.concat([boss]) : enemies;
  targets.forEach((en) => {
    const dx = en.x - player.x, dy = en.y - player.y;
    const d = Math.hypot(dx, dy);
    // udari le, kar je pred igralcem (v smeri pogleda)
    const facing = (dx * player.fx + dy * player.fy) / (d || 1);
    if (d < reach + en.r && facing > 0.0) {
      en.hp -= 7;            // močnejši udarec — zbije več življenja
      en.x += (dx / (d || 1)) * 40; en.y += (dy / (d || 1)) * 40;   // večji odboj
      burst(en.x, en.y, "#9be36b", 12);
    }
  });
  shake = 7;
}

/* ---------- spawn ---------- */
function spawnEnemy() {
  for (let tries = 0; tries < 20; tries++) {
    const edge = Math.floor(Math.random() * 3);
    let x, y;
    if (edge === 0) { x = W - 40; y = 40 + Math.random() * (H - 80); }
    else if (edge === 1) { x = 250 + Math.random() * (W - 300); y = 40; }
    else { x = 250 + Math.random() * (W - 300); y = H - 40; }
    if (!inWallOrEdge(x, y, 24) && Math.hypot(x - player.x, y - player.y) > 220) {
      const big = Math.random() < 0.3;
      enemies.push({ x, y, r: big ? 26 : 20, hp: diff.enemyHp + (big ? 1 : 0), speed: diff.enemySpeed * (big ? 0.8 : 1), bob: Math.random() * 6, big });
      return;
    }
  }
}
function spawnHeart() {
  for (let tries = 0; tries < 20; tries++) {
    const x = 220 + Math.random() * (W - 280);
    const y = 50 + Math.random() * (H - 100);
    if (!inWallOrEdge(x, y, 16) && Math.hypot(x - player.x, y - player.y) > 120) {
      hearts.push({ x, y, r: 12, t: 0 });
      return;
    }
  }
}
function spawnBoss() {
  boss = { x: W - 90, y: H / 2, r: 54, hp: diff.bossHp, maxHp: diff.bossHp, speed: diff.enemySpeed * 0.55, bob: 0, big: true, step: 0 };
  bossWarn = 120;
  sfx.boss();
}

/* ---------- pomožno ---------- */
function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) particles.push({ x, y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 26, c: color });
}
function floatText(x, y, text, c, size) { floatTexts.push({ x, y, text, c: c || "#fff", size: size || 20, t: 30 }); }
function hurtPlayer() {
  if (player.invuln > 0) return;
  player.hp--; player.invuln = 75; shake = 8; sfx.hurt();
  if (player.hp <= 0) { state = STATE.LOSE; endAt = performance.now(); sfx.lose(); }
}
/* zombi ozdravljen → spet človek */
function cure(en) {
  kills++; score += 1; sfx.heal();
  burst(en.x, en.y, "#ffd24d", 14);
  floatText(en.x, en.y, LANG === "en" ? "cured!" : "ozdravljen!", "#7CFC9A", 18);
  if (Math.random() < 0.18 && player.hp < player.maxHp) hearts.push({ x: en.x, y: en.y, r: 12, t: 0 });
}

/* ---------- posodobitev ---------- */
function update() {
  frame++;
  if (state !== STATE.PLAY) return;

  if (player.cooldown > 0) player.cooldown--;
  if (player.slashCd > 0) player.slashCd--;
  if (player.slashTimer > 0) player.slashTimer--;
  if (player.invuln > 0) player.invuln--;
  if (shake > 0) shake--;
  if (bossWarn > 0) bossWarn--;

  /* premik s tipkami */
  let dx = 0, dy = 0;
  if (keys["arrowup"] || keys["w"]) dy -= 1;
  if (keys["arrowdown"] || keys["s"]) dy += 1;
  if (keys["arrowleft"] || keys["a"]) dx -= 1;
  if (keys["arrowright"] || keys["d"]) dx += 1;
  if (dx || dy) {
    const d = Math.hypot(dx, dy);
    player.fx = dx / d; player.fy = dy / d;
    tryMove(player, (dx / d) * player.speed, (dy / d) * player.speed);
    player.step += 0.3;
  }
  /* premik z joystickom (mobilno) */
  const joy = window.azvJoystick;
  if (joy && joy.active && (joy.x || joy.y)) {
    const jd = Math.hypot(joy.x, joy.y) || 1;
    player.fx = joy.x / jd; player.fy = joy.y / jd;
    tryMove(player, joy.x * player.speed, joy.y * player.speed);
    player.step += 0.3;
  }
  /* streljanje s tipko (drži preslednico) */
  if (keys[" "]) shoot();

  /* izstrelki */
  bullets.forEach((b) => { b.x += b.vx; b.y += b.vy; b.life--; if (hitsWall(b.x, b.y, b.r)) b.life = 0; });
  bullets = bullets.filter((b) => b.life > 0 && b.x > -20 && b.x < W + 20 && b.y > -20 && b.y < H + 20);

  /* spawn zombijev (ne, ko je boss) */
  if (!boss && !bossDefeated) {
    spawnTimer++;
    if (spawnTimer >= diff.spawnEvery && enemies.length < diff.maxEnemies) { spawnEnemy(); spawnTimer = 0; }
    if (kills >= diff.killsToBoss) { spawnBoss(); }  // preostali zombiji ostanejo
  }
  /* srčki */
  heartTimer++;
  if (heartTimer >= 320 && hearts.length < 2 && player.hp < player.maxHp) { spawnHeart(); heartTimer = 0; }
  hearts.forEach((h) => h.t++);

  /* AI zombijev */
  enemies.forEach((en) => {
    en.bob += 0.18;
    const ex = player.x - en.x, ey = player.y - en.y;
    const ed = Math.hypot(ex, ey) || 1;
    en.fx = ex / ed; en.fy = ey / ed;
    tryMove(en, (ex / ed) * en.speed, (ey / ed) * en.speed);
    if (ed < en.r + player.r) hurtPlayer();
  });
  /* boss */
  if (boss) {
    boss.bob += 0.12; boss.step += boss.speed * 0.1;
    const ex = player.x - boss.x, ey = player.y - boss.y;
    const ed = Math.hypot(ex, ey) || 1;
    boss.fx = ex / ed; boss.fy = ey / ed;
    boss.x += (ex / ed) * boss.speed; boss.y += (ey / ed) * boss.speed;  // boss prečka tudi drevesa
    boss.x = Math.max(boss.r, Math.min(W - boss.r, boss.x));
    boss.y = Math.max(boss.r, Math.min(H - boss.r, boss.y));
    if (ed < boss.r + player.r) hurtPlayer();
  }

  /* izstrelek vs zombi / boss */
  bullets.forEach((b) => {
    enemies.forEach((en) => {
      if (b.life > 0 && (b.x - en.x) ** 2 + (b.y - en.y) ** 2 < (b.r + en.r) ** 2) {
        en.hp--; b.life = 0; sfx.hit(); burst(b.x, b.y, "#9be36b", 6);
      }
    });
    if (boss && b.life > 0 && (b.x - boss.x) ** 2 + (b.y - boss.y) ** 2 < (b.r + boss.r) ** 2) {
      boss.hp--; b.life = 0; sfx.hit(); burst(b.x, b.y, "#9be36b", 6);
    }
  });
  bullets = bullets.filter((b) => b.life > 0);

  /* ozdravljeni zombiji */
  enemies.forEach((en) => { if (en.hp <= 0) cure(en); });
  enemies = enemies.filter((en) => en.hp > 0);

  /* boss premagan */
  if (boss && boss.hp <= 0) {
    score += 10; bossDefeated = true; burst(boss.x, boss.y, "#ffd400", 40); boss = null;
    state = STATE.WIN; endAt = performance.now(); sfx.win();
  }

  /* pobiranje srčkov */
  hearts.forEach((h) => {
    if ((h.x - player.x) ** 2 + (h.y - player.y) ** 2 < (h.r + player.r) ** 2) {
      h.dead = true;
      if (player.hp < player.maxHp) { player.hp++; floatText(player.x, player.y - 20, "+❤️", "#e23b3b", 22); sfx.heart(); }
    }
  });
  hearts = hearts.filter((h) => !h.dead && h.t < 600);

  /* delci / besedila */
  particles.forEach((p) => { p.x += p.vx; p.y += p.vy; p.life--; });
  particles = particles.filter((p) => p.life > 0);
  floatTexts.forEach((t) => { t.y -= 0.6; t.t--; });
  floatTexts = floatTexts.filter((t) => t.t > 0);
}

/* ===========================================================
   IZRIS
   =========================================================== */
function clearForest() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#10301c");
  g.addColorStop(1, "#06160d");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // luna
  ctx.fillStyle = "#dfeccf"; ctx.beginPath(); ctx.arc(W - 80, 64, 24, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(16,48,28,0.55)"; ctx.beginPath(); ctx.arc(W - 70, 58, 20, 0, Math.PI * 2); ctx.fill();
  // zvezde
  ctx.fillStyle = "#cfe6c8";
  stars.forEach((s) => { ctx.globalAlpha = 0.3 + 0.45 * Math.abs(Math.sin(frame * 0.04 + s.ph)); ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); });
  ctx.globalAlpha = 1;
  // oddaljena drevesa (silhuete)
  ctx.fillStyle = "#0a2414";
  bgTrees.forEach((t) => {
    ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(t.x - t.s * 0.5, t.y + t.s); ctx.lineTo(t.x + t.s * 0.5, t.y + t.s); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(t.x, t.y - t.s * 0.4); ctx.lineTo(t.x - t.s * 0.42, t.y + t.s * 0.5); ctx.lineTo(t.x + t.s * 0.42, t.y + t.s * 0.5); ctx.closePath(); ctx.fill();
  });
  // tla
  ctx.fillStyle = "#082011"; ctx.fillRect(0, H - 16, W, 16);
}
function drawTrees() {
  walls.forEach((w) => {
    const cx = w.x + w.w / 2;
    // deblo
    ctx.fillStyle = "#4a3320"; ctx.strokeStyle = "#2c1d10"; ctx.lineWidth = 3;
    ctx.fillRect(w.x + w.w * 0.28, w.y + 8, w.w * 0.44, w.h - 8);
    ctx.strokeRect(w.x + w.w * 0.28, w.y + 8, w.w * 0.44, w.h - 8);
    // krošnja (več zelenih blobov vzdolž debla)
    for (let yy = w.y + 6; yy < w.y + w.h; yy += 34) {
      ctx.fillStyle = "#1f6b32";
      ctx.beginPath(); ctx.arc(cx - 10, yy, 18, 0, Math.PI * 2); ctx.arc(cx + 12, yy + 8, 16, 0, Math.PI * 2); ctx.arc(cx, yy + 16, 19, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#2e8c43";
      ctx.beginPath(); ctx.arc(cx - 6, yy + 4, 11, 0, Math.PI * 2); ctx.arc(cx + 8, yy + 12, 10, 0, Math.PI * 2); ctx.fill();
    }
  });
}
/* najstnik z minigunom in kijem */
function drawHero(x, y, r, fx, fy, step, hurt) {
  ctx.save();
  ctx.translate(x, y);
  const flip = fx < 0;
  if (flip) ctx.scale(-1, 1);
  if (hurt) ctx.globalAlpha = 0.5;
  const legSwing = Math.sin(step) * 4;
  // noge
  ctx.strokeStyle = "#2b3a5a"; ctx.lineWidth = 5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-4, r * 0.5); ctx.lineTo(-4 - legSwing, r * 1.15); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, r * 0.5); ctx.lineTo(4 + legSwing, r * 1.15); ctx.stroke();
  // telo (jopica)
  ctx.fillStyle = "#3a7bd5";
  ctx.beginPath(); ctx.ellipse(0, r * 0.25, r * 0.5, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
  // kij na hrbtu
  ctx.strokeStyle = "#7a4a22"; ctx.lineWidth = 6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-r * 0.3, r * 0.5); ctx.lineTo(-r * 0.7, -r * 0.4); ctx.stroke();
  ctx.fillStyle = "#7a4a22"; ctx.beginPath(); ctx.arc(-r * 0.7, -r * 0.45, 7, 0, Math.PI * 2); ctx.fill();
  // glava
  ctx.fillStyle = "#f3c89a";
  ctx.beginPath(); ctx.arc(0, -r * 0.45, r * 0.45, 0, Math.PI * 2); ctx.fill();
  // lasje
  ctx.fillStyle = "#3a2616";
  ctx.beginPath(); ctx.arc(0, -r * 0.55, r * 0.46, Math.PI, 0); ctx.fill();
  // oko
  ctx.fillStyle = "#1a1a1a"; ctx.beginPath(); ctx.arc(r * 0.18, -r * 0.45, r * 0.07, 0, Math.PI * 2); ctx.fill();
  // minigun (v smeri pogleda = desno po flipu)
  ctx.save();
  ctx.translate(r * 0.3, r * 0.1);
  ctx.fillStyle = "#2a2a32";
  ctx.fillRect(0, -6, r * 1.1, 12);
  ctx.fillStyle = "#43434e";
  ctx.fillRect(r * 0.9, -8, 10, 16);
  // cevi
  ctx.fillStyle = "#6a6a76";
  for (let i = -1; i <= 1; i++) ctx.fillRect(r * 1.0, i * 3 - 1.5, 14, 3);
  ctx.restore();
  ctx.restore();
  ctx.globalAlpha = 1;
}
/* zombijeva glava */
function drawZombieHead(en) {
  ctx.save();
  ctx.translate(en.x, en.y + Math.sin(en.bob) * 1.5);
  if ((en.fx || 0) < 0) ctx.scale(-1, 1);
  const r = en.r;
  // glava
  ctx.fillStyle = "#5fae54"; ctx.strokeStyle = "#2f6b2a"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // packe / madeži
  ctx.fillStyle = "#4a9140";
  ctx.beginPath(); ctx.arc(-r * 0.4, -r * 0.3, r * 0.22, 0, Math.PI * 2); ctx.arc(r * 0.35, r * 0.3, r * 0.18, 0, Math.PI * 2); ctx.fill();
  // šivi
  ctx.strokeStyle = "#2f6b2a"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-r * 0.2, -r); ctx.lineTo(-r * 0.2, -r * 0.55); ctx.stroke();
  for (let i = 0; i < 4; i++) { const yy = -r * 0.95 + i * r * 0.13; ctx.beginPath(); ctx.moveTo(-r * 0.32, yy); ctx.lineTo(-r * 0.08, yy); ctx.stroke(); }
  // oči (X / mrtve)
  ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 2.4; ctx.lineCap = "round";
  [-r * 0.35, r * 0.35].forEach((ex) => {
    ctx.beginPath(); ctx.moveTo(ex - 5, -r * 0.2); ctx.lineTo(ex + 5, -r * 0.05);
    ctx.moveTo(ex + 5, -r * 0.2); ctx.lineTo(ex - 5, -r * 0.05); ctx.stroke();
  });
  // usta z zobmi
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath(); ctx.ellipse(0, r * 0.42, r * 0.42, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#dfeccf";
  for (let i = -2; i <= 2; i++) ctx.fillRect(i * r * 0.16 - 2, r * 0.3, 4, 7);
  ctx.restore();
}
/* velika zombijeva glava z nogami (boss) */
function drawBoss(b) {
  ctx.save();
  ctx.translate(b.x, b.y + Math.sin(b.bob) * 2);
  if ((b.fx || 0) < 0) ctx.scale(-1, 1);
  const r = b.r;
  // noge
  const sw = Math.sin(b.step) * 8;
  ctx.strokeStyle = "#3c7a34"; ctx.lineWidth = 9; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-r * 0.4, r * 0.85); ctx.lineTo(-r * 0.4 - sw, r * 1.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(r * 0.4, r * 0.85); ctx.lineTo(r * 0.4 + sw, r * 1.5); ctx.stroke();
  // stopala
  ctx.fillStyle = "#2f6b2a";
  ctx.beginPath(); ctx.ellipse(-r * 0.4 - sw, r * 1.5, 12, 6, 0, 0, Math.PI * 2); ctx.ellipse(r * 0.4 + sw, r * 1.5, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
  // velika glava
  ctx.fillStyle = "#5fae54"; ctx.strokeStyle = "#2f6b2a"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // madeži
  ctx.fillStyle = "#4a9140";
  ctx.beginPath(); ctx.arc(-r * 0.45, -r * 0.3, r * 0.26, 0, Math.PI * 2); ctx.arc(r * 0.4, r * 0.35, r * 0.22, 0, Math.PI * 2); ctx.fill();
  // šivi
  ctx.strokeStyle = "#2f6b2a"; ctx.lineWidth = 2.4;
  for (let i = 0; i < 5; i++) { const yy = -r * 0.9 + i * r * 0.14; ctx.beginPath(); ctx.moveTo(-r * 0.42, yy); ctx.lineTo(-r * 0.12, yy); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-r * 0.27, -r); ctx.lineTo(-r * 0.27, -r * 0.4); ctx.stroke();
  // jezne oči
  ctx.fillStyle = "#ffe14d";
  ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.15, r * 0.18, 0, Math.PI * 2); ctx.arc(r * 0.35, -r * 0.15, r * 0.18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath(); ctx.arc(-r * 0.32, -r * 0.12, r * 0.08, 0, Math.PI * 2); ctx.arc(r * 0.38, -r * 0.12, r * 0.08, 0, Math.PI * 2); ctx.fill();
  // obrvi
  ctx.strokeStyle = "#2f6b2a"; ctx.lineWidth = 4; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-r * 0.55, -r * 0.42); ctx.lineTo(-r * 0.18, -r * 0.28); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(r * 0.55, -r * 0.42); ctx.lineTo(r * 0.18, -r * 0.28); ctx.stroke();
  // velika usta z zobmi
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath(); ctx.ellipse(0, r * 0.45, r * 0.5, r * 0.26, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#dfeccf";
  for (let i = -3; i <= 3; i++) ctx.fillRect(i * r * 0.14 - 3, r * 0.3, 6, 11);
  ctx.restore();
}
function drawHeart(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = "#e23b3b";
  ctx.beginPath();
  ctx.moveTo(0, s * 0.3);
  ctx.bezierCurveTo(0, 0, -s, 0, -s, s * 0.4);
  ctx.bezierCurveTo(-s, s * 0.9, 0, s * 1.1, 0, s * 1.4);
  ctx.bezierCurveTo(0, s * 1.1, s, s * 0.9, s, s * 0.4);
  ctx.bezierCurveTo(s, 0, 0, 0, 0, s * 0.3);
  ctx.fill(); ctx.restore();
}
function drawBullet(b) {
  ctx.save(); ctx.translate(b.x, b.y);
  ctx.fillStyle = "#ffe14d";
  ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,170,40,0.5)";
  ctx.beginPath(); ctx.arc(-b.vx * 0.6, -b.vy * 0.6, b.r * 0.7, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawClubSwing() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(Math.atan2(player.fy, player.fx));
  ctx.globalAlpha = player.slashTimer / 12;
  const rr = player.r + 26;
  // lok zamaha
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(0, 0, rr, -0.9, 0.9); ctx.stroke();
  // kij
  ctx.strokeStyle = "#7a4a22"; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(rr, 0); ctx.stroke();
  ctx.fillStyle = "#7a4a22"; ctx.beginPath(); ctx.arc(rr, 0, 9, 0, Math.PI * 2); ctx.fill();
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawParticles() {
  particles.forEach((p) => { ctx.globalAlpha = Math.max(0, p.life / 26); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); });
  ctx.globalAlpha = 1;
}
function drawFloatTexts() {
  floatTexts.forEach((t) => { ctx.globalAlpha = Math.min(1, t.t / 18); ctx.fillStyle = t.c; ctx.textAlign = "center"; ctx.font = `bold ${t.size}px "Baloo 2", sans-serif`; ctx.fillText(t.text, t.x, t.y); });
  ctx.globalAlpha = 1;
}

function drawHUD() {
  for (let i = 0; i < player.maxHp; i++) {
    ctx.globalAlpha = i < player.hp ? 1 : 0.25;
    drawHeart(26 + i * 28, 16, 9);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "left"; ctx.font = "bold 14px sans-serif";
  ctx.fillStyle = player.slashCd <= 0 ? "#7CFC9A" : "#88a";
  ctx.fillText(player.slashCd <= 0 ? G.hudSlashReady : G.hudSlash + " …", 20, 60);
  if (boss) {
    const bw = 300, bx = (W - bw) / 2, by = 18;
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(bx, by, bw, 14);
    ctx.fillStyle = "#5fae54"; ctx.fillRect(bx, by, bw * (boss.hp / boss.maxHp), 14);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, 14);
  }
  ctx.textAlign = "right"; ctx.font = "bold 22px sans-serif"; ctx.fillStyle = "#fff";
  ctx.fillText(G.hudScore + score, W - 20, 34);
  ctx.textAlign = "center";
}

/* zasloni */
function panel(title, lines, footer) {
  ctx.fillStyle = "rgba(253,253,247,0.93)"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#1a1a1a"; ctx.textAlign = "center";
  ctx.font = 'bold 40px "Baloo 2", sans-serif'; ctx.fillText(title, W / 2, 130);
  ctx.font = '20px "Baloo 2", sans-serif';
  lines.forEach((l, i) => ctx.fillText(l, W / 2, 200 + i * 36));
  if (footer) { ctx.fillStyle = "#0a6cc2"; ctx.font = 'bold 22px "Baloo 2", sans-serif'; ctx.fillText(footer, W / 2, H - 70 + 4 * Math.sin(frame * 0.1)); }
}
function drawIntro() {
  clearForest();
  drawTrees();
  drawHero(W * 0.74, H / 2 + 10, 44, 1, 0, frame * 0.12, false);
  ctx.fillStyle = "#fff"; ctx.textAlign = "left";
  ctx.font = 'bold 40px "Baloo 2", sans-serif'; ctx.fillText(G.introTitle, 56, 132);
  ctx.font = 'bold 38px "Baloo 2", sans-serif'; ctx.fillStyle = "#7CFC9A"; ctx.fillText(G.introSub, 56, 178);
  ctx.font = '18px "Baloo 2", sans-serif'; ctx.fillStyle = "#d4e6cf";
  ctx.fillText(G.introL1, 56, 244); ctx.fillText(G.introL2, 56, 272); ctx.fillText(G.introL3, 56, 300);
  ctx.fillStyle = "#ffe14d"; ctx.font = 'bold 22px "Baloo 2", sans-serif';
  ctx.fillText(G.introStart, 56, 396 + 4 * Math.sin(frame * 0.1));
}
function drawSelect() {
  clearForest();
  ctx.fillStyle = "#fff"; ctx.textAlign = "center";
  ctx.font = 'bold 40px "Baloo 2", sans-serif'; ctx.fillText(G.selectTitle, W / 2, 120);
  ctx.font = '17px "Baloo 2", sans-serif'; ctx.fillStyle = "#d4e6cf";
  ctx.fillText(G.selectHint, W / 2, 160);
  const bw = 460, bh = 80, bx = (W - bw) / 2;
  DIFFICULTIES.forEach((d, i) => {
    const by = 200 + i * 95; const sel = i === diffIndex;
    ctx.fillStyle = sel ? "#dff7d0" : "#fdfdf7"; ctx.strokeStyle = sel ? "#3c9e44" : "#2b2b2b"; ctx.lineWidth = sel ? 5 : 3;
    roundRect(bx, by, bw, bh, 14); ctx.fill(); ctx.stroke();
    ctx.textAlign = "left"; ctx.fillStyle = "#1a1a1a"; ctx.font = 'bold 28px "Baloo 2", sans-serif';
    ctx.fillText((i + 1) + ". " + G.diffNames[i], bx + 24, by + 36);
    ctx.fillStyle = "#555"; ctx.font = '16px "Baloo 2", sans-serif'; ctx.fillText(G.diffDescs[i], bx + 24, by + 62);
    ctx.fillStyle = "#e23b3b"; ctx.textAlign = "right"; ctx.font = '20px sans-serif'; ctx.fillText("♥".repeat(d.hp), bx + bw - 20, by + 48);
  });
  ctx.textAlign = "center";
}
function drawStory() {
  clearForest();
  const tw = W * 0.7, tx = (W - tw) / 2;
  ctx.fillStyle = "#fff"; ctx.strokeStyle = "#2b2b2b"; ctx.lineWidth = 3;
  roundRect(tx, H / 2 - 110, tw, 200, 16); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#1a1a1a"; ctx.textAlign = "center"; ctx.font = '24px "Baloo 2", sans-serif';
  wrapText(G.story[storyPage], W / 2, H / 2 - 40, tw - 60, 34);
  ctx.fillStyle = "#0a6cc2"; ctx.font = 'bold 18px "Baloo 2", sans-serif';
  ctx.fillText(G.storyNext, W / 2, H / 2 + 70);
}
function roundRect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function wrapText(text, x, y, maxW, lh) {
  const words = text.split(" "); let line = "", yy = y;
  words.forEach((w) => { const test = line + w + " "; if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line.trim(), x, yy); line = w + " "; yy += lh; } else line = test; });
  ctx.fillText(line.trim(), x, yy);
}

function render() {
  if (state === STATE.INTRO) { drawIntro(); return; }
  if (state === STATE.SELECT) { drawSelect(); return; }
  if (state === STATE.STORY) { drawStory(); return; }

  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  clearForest();
  drawTrees();
  hearts.forEach((h) => drawHeart(h.x, h.y, 9));
  enemies.forEach(drawZombieHead);
  if (boss) drawBoss(boss);
  bullets.forEach(drawBullet);
  if (player.slashTimer > 0) drawClubSwing();
  drawHero(player.x, player.y, player.r, player.fx, player.fy, player.step, player.invuln > 0 && Math.floor(frame / 4) % 2 === 0);
  drawParticles();
  drawFloatTexts();
  ctx.restore();

  drawHUD();
  if (bossWarn > 0 && Math.floor(frame / 8) % 2 === 0) {
    ctx.fillStyle = "#7CFC9A"; ctx.textAlign = "center"; ctx.font = 'bold 28px "Baloo 2", sans-serif';
    ctx.fillText(G.bossWarn, W / 2, H / 2);
  }

  if (state === STATE.WIN || state === STATE.LOSE) {
    if (endScreen !== state) { endScreen = state; endAt = performance.now(); }
    const left = Math.max(0, END_DELAY - (performance.now() - endAt));
    const isWin = state === STATE.WIN;
    const foot = left > 0
      ? (LANG === "en" ? "Wait " : "Počakaj ") + Math.ceil(left / 1000) + " …"
      : (isWin ? G.winFoot : G.loseFoot);
    panel(isWin ? G.winTitle : G.loseTitle, (isWin ? G.winLines : G.loseLines).concat([G.hudScore + score]), foot);
  }
}

/* ---------- zanka ---------- */
/* fiksni časovni korak 60 Hz — hitrost neodvisna od osveževanja zaslona */
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
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ---------- mobilni akcijski gumbi (primarna = minigun, sekundarna = kij) ---------- */
if (window.azvRegisterControls) {
  window.azvRegisterControls({
    primary: () => { initAudio(); if (state === STATE.PLAY) shoot(); },
    secondary: () => { initAudio(); if (state === STATE.PLAY) club(); },
    primaryLabel: "🔫", secondaryLabel: "🏏", axis: "both",
  });
}
