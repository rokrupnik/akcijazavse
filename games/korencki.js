/* ===========================================================
   NOČ STRAŠNIH KORENČKOV  (avtor zgodbe: Jakob)
   Ti si super mucek v mestnem labirintu. Streljaj krempljčke
   in grizi! Pobiraj srčke ❤️ in premagaj velikanski korenček.
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
  claw()  { beep(900, 0.09, "square", 0.10, 300); },             // krempelj žvrr
  bite()  { noiseBurst(0.12, 0.14); beep(180, 0.10, "square", 0.10, 90); }, // grr ugriz
  hit()   { beep(320, 0.05, "square", 0.08, 160); },
  kill()  { beep(200, 0.18, "triangle", 0.18, 540); },
  hurt()  { beep(200, 0.30, "sawtooth", 0.22, 60); noiseBurst(0.15, 0.08); },
  heart() { seq([523, 659, 784, 1047], 0.09, "triangle", 0.2); },
  boss()  { beep(80, 0.6, "sawtooth", 0.22, 45); },
  win()   { seq([523, 659, 784, 1047, 1319], 0.14, "triangle", 0.22); },
  lose()  { seq([400, 330, 260, 180], 0.15, "sawtooth", 0.2); },
};

/* ---------- besedila (SL / EN) ---------- */
const LANG = (typeof localStorage !== "undefined" && localStorage.getItem("azv-lang") === "en") ? "en" : "sl";
const GT = {
  sl: {
    introTitle: "NOČ STRAŠNIH", introSub: "KORENČKOV 🥕",
    introL1: "Ti si super mucek, ki brani mesto!",
    introL2: "Streljaj krempljčke in grizi! 🐱",
    introL3: "Pobiraj srčke in premagaj velikanski korenček.",
    introStart: "Pritisni PRESLEDNICO ali tapni za začetek",
    selectTitle: "Izberi težavnost",
    selectHint: "Tipke ↑ ↓ in preslednica  •  ali tapni izbiro",
    storyNext: "(tapni / preslednica za naprej)",
    hudScore: "Točke: ", hudSlash: "UGRIZ", hudSlashReady: "UGRIZ pripravljen!",
    sndOn: "🔊 zvok", sndOff: "🔇 zvok",
    bossWarn: "POZOR — VELIKANSKI KORENČEK!",
    winTitle: "ZMAGA! 🎉",
    winLines: ["Velikanski korenček je premagan!", "Mesto je rešeno. Bravo, super mucek! 🐱"],
    winFoot: "Pritisni preslednico / tapni za novo igro",
    loseTitle: "KONEC 💔",
    loseLines: ["Korenčki so bili premočni...", "a super mucek se ne preda!"],
    loseFoot: "Pritisni preslednico / tapni za nov poskus",
    diffNames: ["LAHKO", "SREDNJE", "TEŽKO"],
    diffDescs: ["5 življenj, manj korenčkov", "3 življenja, več akcije", "3 življenja, prava invazija!"],
    story: [
      "Nekdo je skuhal korenčkovo juho in šel spat.",
      "A s korenčki se je nekaj zgodilo — šli so ven!",
      "V jami so se spremenili v korenčke-netopirje in napadli mesto.",
      "Ustavi jih lahko le SUPER MUCEK — to si ti! Pokaži jim kremplje!",
    ],
  },
  en: {
    introTitle: "NIGHT OF THE", introSub: "SCARY CARROTS 🥕",
    introL1: "You are Super Kitty, defending the city!",
    introL2: "Shoot claws and bite! 🐱",
    introL3: "Collect hearts and beat the giant carrot.",
    introStart: "Press SPACE or tap to start",
    selectTitle: "Choose difficulty",
    selectHint: "Keys ↑ ↓ and space  •  or tap to choose",
    storyNext: "(tap / space to continue)",
    hudScore: "Score: ", hudSlash: "BITE", hudSlashReady: "BITE ready!",
    sndOn: "🔊 sound", sndOff: "🔇 sound",
    bossWarn: "WATCH OUT — GIANT CARROT!",
    winTitle: "VICTORY! 🎉",
    winLines: ["The giant carrot is beaten!", "The city is saved. Well done, Super Kitty! 🐱"],
    winFoot: "Press space / tap for a new game",
    loseTitle: "GAME OVER 💔",
    loseLines: ["The carrots were too strong...", "but Super Kitty never gives up!"],
    loseFoot: "Press space / tap to try again",
    diffNames: ["EASY", "MEDIUM", "HARD"],
    diffDescs: ["5 lives, fewer carrots", "3 lives, more action", "3 lives, a real invasion!"],
    story: [
      "Someone cooked carrot soup and went to bed.",
      "But something happened to the carrots — they escaped!",
      "In a cave they turned into carrot-bats and attacked the city.",
      "Only SUPER KITTY can stop them — that's you! Show your claws!",
    ],
  },
};
const G = GT[LANG];

/* ---------- stanje ---------- */
const STATE = { INTRO: "intro", SELECT: "select", STORY: "story", PLAY: "play", WIN: "win", LOSE: "lose" };
let state = STATE.INTRO;
let storyPage = 0;

const DIFFICULTIES = [
  { hp: 5, spawnEvery: 110, maxEnemies: 4, enemySpeed: 0.80, enemyHp: 2, killsToBoss: 8,  bossHp: 26 },
  { hp: 3, spawnEvery: 80,  maxEnemies: 6, enemySpeed: 1.15, enemyHp: 3, killsToBoss: 12, bossHp: 44 },
  { hp: 3, spawnEvery: 55,  maxEnemies: 8, enemySpeed: 1.55, enemyHp: 3, killsToBoss: 15, bossHp: 62 },
];
let diffIndex = 0;
let diff = DIFFICULTIES[0];

/* ---------- mestni labirint (stolpnice) ---------- */
const walls = [
  { x: 150, y: 60,  w: 36, h: 170 },
  { x: 150, y: 330, w: 36, h: 150 },
  { x: 300, y: 0,   w: 36, h: 185 },
  { x: 300, y: 300, w: 36, h: 240 },
  { x: 450, y: 120, w: 36, h: 300 },
  { x: 600, y: 0,   w: 36, h: 200 },
  { x: 600, y: 320, w: 36, h: 220 },
  { x: 740, y: 130, w: 36, h: 280 },
];

/* ---------- zvezde v ozadju ---------- */
const stars = [];
for (let i = 0; i < 70; i++) {
  stars.push({ x: Math.random() * W, y: Math.random() * (H * 0.78), r: Math.random() * 1.6 + 0.4, ph: Math.random() * 6 });
}

/* ---------- igralec (super mucek) ---------- */
const player = {
  x: 75, y: H / 2, r: 18, speed: 3.4,
  hp: 3, maxHp: 3,
  fx: 1, fy: 0,            // smer, v katero gleda / strelja
  cooldown: 0,            // krempelj
  slashCd: 0,             // ugriz (sekundarna moč)
  slashTimer: 0,          // izris ugriza
  invuln: 0,
  flap: 0,
};

/* ---------- seznami ---------- */
let claws = [];        // igralčevi krempljčki
let enemies = [];      // korenčki-netopirji
let hearts = [];       // srčki za pobrati
let particles = [];
let floatTexts = [];

let score = 0;
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
    if (k === "m") bite();
  }
}

/* ---------- dotik / miška ---------- */
let moveTarget = null;
let lastTapAt = -999;
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

function aimAt(tx, ty) {
  const dx = tx - player.x, dy = ty - player.y;
  const d = Math.hypot(dx, dy) || 1;
  player.fx = dx / d; player.fy = dy / d;
}

/* ---------- zagon / ponastavitev ---------- */
function startGame() {
  state = STATE.PLAY;
  claws = []; enemies = []; hearts = []; particles = []; floatTexts = [];
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
  player.cooldown = 14;
  claws.push({ x: player.x + player.fx * player.r, y: player.y + player.fy * player.r, vx: player.fx * 6.6, vy: player.fy * 6.6, r: 7, life: 90 });
  sfx.claw();
}
function bite() {
  if (player.slashCd > 0) return;
  player.slashCd = 70;     // ~1,2 s do naslednjega ugriza
  player.slashTimer = 12;
  sfx.bite();
  const reach = player.r + 34;
  const targets = boss ? enemies.concat([boss]) : enemies;
  targets.forEach((en) => {
    const dx = en.x - player.x, dy = en.y - player.y;
    const d = Math.hypot(dx, dy);
    if (d < reach + en.r) {
      en.hp -= 2;
      en.x += (dx / (d || 1)) * 24; en.y += (dy / (d || 1)) * 24;
      burst(en.x, en.y, "#fff", 8);
    }
  });
  shake = 4;
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
      enemies.push({ x, y, r: big ? 26 : 20, hp: diff.enemyHp + (big ? 1 : 0), speed: diff.enemySpeed * (big ? 0.8 : 1), flap: Math.random() * 6, big });
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
  boss = { x: W - 90, y: H / 2, r: 54, hp: diff.bossHp, maxHp: diff.bossHp, speed: diff.enemySpeed * 0.55, flap: 0, big: true };
  bossWarn = 120;
  sfx.boss();
}

/* ---------- pomožno ---------- */
function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) particles.push({ x, y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 26, c: color });
}
function floatText(x, y, text, c, size) { floatTexts.push({ x, y, text, c: c || "#fff", size: size || 20, t: 28 }); }
function hurtPlayer() {
  if (player.invuln > 0) return;
  player.hp--; player.invuln = 75; shake = 8; sfx.hurt();
  if (player.hp <= 0) { state = STATE.LOSE; endAt = performance.now(); sfx.lose(); }
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
  player.flap += 0.3;

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
  }
  /* premik z joystickom (mobilno) */
  const joy = window.azvJoystick;
  if (joy && joy.active && (joy.x || joy.y)) {
    const jd = Math.hypot(joy.x, joy.y) || 1;
    player.fx = joy.x / jd; player.fy = joy.y / jd;
    tryMove(player, joy.x * player.speed, joy.y * player.speed);
  }
  /* streljanje s tipko (drži preslednico) */
  if (keys[" "]) shoot();

  /* krempljčki */
  claws.forEach((b) => { b.x += b.vx; b.y += b.vy; b.life--; if (hitsWall(b.x, b.y, b.r)) b.life = 0; });
  claws = claws.filter((b) => b.life > 0 && b.x > -20 && b.x < W + 20 && b.y > -20 && b.y < H + 20);

  /* spawn korenčkov (ne, ko je boss) */
  if (!boss && !bossDefeated) {
    spawnTimer++;
    if (spawnTimer >= diff.spawnEvery && enemies.length < diff.maxEnemies) { spawnEnemy(); spawnTimer = 0; }
    if (kills >= diff.killsToBoss) { spawnBoss(); }  // preostali korenčki ostanejo
  }
  /* srčki */
  heartTimer++;
  if (heartTimer >= 320 && hearts.length < 2 && player.hp < player.maxHp) { spawnHeart(); heartTimer = 0; }
  hearts.forEach((h) => h.t++);

  /* AI korenčkov */
  enemies.forEach((en) => {
    en.flap += 0.25;
    const ex = player.x - en.x, ey = player.y - en.y;
    const ed = Math.hypot(ex, ey) || 1;
    en.fx = ex / ed; en.fy = ey / ed;
    tryMove(en, (ex / ed) * en.speed, (ey / ed) * en.speed);
    if (ed < en.r + player.r) hurtPlayer();
  });
  /* boss */
  if (boss) {
    boss.flap += 0.18;
    const ex = player.x - boss.x, ey = player.y - boss.y;
    const ed = Math.hypot(ex, ey) || 1;
    boss.fx = ex / ed; boss.fy = ey / ed;
    boss.x += (ex / ed) * boss.speed; boss.y += (ey / ed) * boss.speed;  // boss prečka tudi stavbe
    boss.x = Math.max(boss.r, Math.min(W - boss.r, boss.x));
    boss.y = Math.max(boss.r, Math.min(H - boss.r, boss.y));
    if (ed < boss.r + player.r) hurtPlayer();
  }

  /* krempelj vs korenček / boss */
  claws.forEach((b) => {
    enemies.forEach((en) => {
      if (b.life > 0 && (b.x - en.x) ** 2 + (b.y - en.y) ** 2 < (b.r + en.r) ** 2) {
        en.hp--; b.life = 0; sfx.hit(); burst(b.x, b.y, "#ffd24d", 6);
      }
    });
    if (boss && b.life > 0 && (b.x - boss.x) ** 2 + (b.y - boss.y) ** 2 < (b.r + boss.r) ** 2) {
      boss.hp--; b.life = 0; sfx.hit(); burst(b.x, b.y, "#ffd24d", 6);
    }
  });
  claws = claws.filter((b) => b.life > 0);

  /* mrtvi korenčki */
  enemies.forEach((en) => {
    if (en.hp <= 0) {
      kills++; score += 10; sfx.kill(); burst(en.x, en.y, "#ff9b3b", 14);
      floatText(en.x, en.y, "+10", "#ffd400", 20);
      if (Math.random() < 0.18 && player.hp < player.maxHp) hearts.push({ x: en.x, y: en.y, r: 12, t: 0 });
    }
  });
  enemies = enemies.filter((en) => en.hp > 0);

  /* boss premagan */
  if (boss && boss.hp <= 0) {
    score += 100; bossDefeated = true; burst(boss.x, boss.y, "#ffd400", 40); boss = null;
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
function clearNight() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#1b2a4a");
  g.addColorStop(1, "#0d1526");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // luna
  ctx.fillStyle = "#f5f3d0"; ctx.beginPath(); ctx.arc(W - 80, 66, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(27,42,74,0.6)"; ctx.beginPath(); ctx.arc(W - 70, 60, 22, 0, Math.PI * 2); ctx.fill();
  // zvezde
  ctx.fillStyle = "#fff";
  stars.forEach((s) => { ctx.globalAlpha = 0.35 + 0.5 * Math.abs(Math.sin(frame * 0.04 + s.ph)); ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); });
  ctx.globalAlpha = 1;
  // tla
  ctx.fillStyle = "#10182b"; ctx.fillRect(0, H - 16, W, 16);
}
function drawBuildings() {
  walls.forEach((w) => {
    ctx.fillStyle = "#2b3550"; ctx.strokeStyle = "#161d30"; ctx.lineWidth = 3;
    ctx.fillRect(w.x, w.y, w.w, w.h); ctx.strokeRect(w.x, w.y, w.w, w.h);
    // okna
    for (let yy = w.y + 12; yy < w.y + w.h - 10; yy += 22) {
      for (let xx = w.x + 6; xx < w.x + w.w - 8; xx += 14) {
        ctx.fillStyle = (xx + yy) % 3 === 0 ? "rgba(255,213,77,0.85)" : "rgba(120,140,180,0.35)";
        ctx.fillRect(xx, yy, 7, 11);
      }
    }
  });
}
function drawCat(x, y, r, fx, fy, flap, hurt) {
  ctx.save();
  ctx.translate(x, y);
  if (fx < 0) ctx.scale(-1, 1);
  if (hurt) ctx.globalAlpha = 0.5;
  const bob = Math.sin(flap) * 1.5;
  // plašč (cape)
  ctx.fillStyle = "#d33";
  ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.2 + bob); ctx.lineTo(-r * 1.2, r * 0.9 + bob); ctx.lineTo(-r * 0.1, r * 0.7 + bob); ctx.closePath(); ctx.fill();
  // telo
  ctx.fillStyle = "#9aa0a6";
  ctx.beginPath(); ctx.ellipse(0, r * 0.35 + bob, r * 0.78, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  // glava
  ctx.beginPath(); ctx.arc(0, -r * 0.35 + bob, r * 0.66, 0, Math.PI * 2); ctx.fill();
  // ušesa
  ctx.beginPath(); ctx.moveTo(-r * 0.55, -r * 0.75 + bob); ctx.lineTo(-r * 0.3, -r * 1.25 + bob); ctx.lineTo(-r * 0.1, -r * 0.8 + bob); ctx.fill();
  ctx.beginPath(); ctx.moveTo(r * 0.55, -r * 0.75 + bob); ctx.lineTo(r * 0.3, -r * 1.25 + bob); ctx.lineTo(r * 0.1, -r * 0.8 + bob); ctx.fill();
  // super maska
  ctx.fillStyle = "#2b6fff";
  ctx.beginPath(); ctx.ellipse(0, -r * 0.4 + bob, r * 0.6, r * 0.24, 0, 0, Math.PI * 2); ctx.fill();
  // oči
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(-r * 0.22, -r * 0.4 + bob, r * 0.16, 0, Math.PI * 2); ctx.arc(r * 0.22, -r * 0.4 + bob, r * 0.16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath(); ctx.arc(-r * 0.18, -r * 0.4 + bob, r * 0.08, 0, Math.PI * 2); ctx.arc(r * 0.26, -r * 0.4 + bob, r * 0.08, 0, Math.PI * 2); ctx.fill();
  // nos
  ctx.fillStyle = "#ff8aa0"; ctx.beginPath(); ctx.arc(0, -r * 0.18 + bob, r * 0.08, 0, Math.PI * 2); ctx.fill();
  // brki
  ctx.strokeStyle = "#eee"; ctx.lineWidth = 1.5;
  for (let s = -1; s <= 1; s += 2) {
    ctx.beginPath(); ctx.moveTo(s * r * 0.1, -r * 0.12 + bob); ctx.lineTo(s * r * 0.7, -r * 0.22 + bob); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * r * 0.1, -r * 0.05 + bob); ctx.lineTo(s * r * 0.7, -r * 0.02 + bob); ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
function drawBat(en) {
  ctx.save();
  ctx.translate(en.x, en.y);
  if ((en.fx || 0) < 0) ctx.scale(-1, 1);
  const r = en.r;
  const w = Math.sin(en.flap) * 0.35;
  // krila (netopir)
  ctx.fillStyle = "#4a3320";
  ctx.beginPath(); ctx.moveTo(0, -r * 0.1); ctx.quadraticCurveTo(-r * 1.6, -r * (0.9 + w), -r * 1.7, r * 0.3); ctx.quadraticCurveTo(-r * 1.0, -r * 0.1, 0, r * 0.2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, -r * 0.1); ctx.quadraticCurveTo(r * 1.6, -r * (0.9 + w), r * 1.7, r * 0.3); ctx.quadraticCurveTo(r * 1.0, -r * 0.1, 0, r * 0.2); ctx.fill();
  // korenček (telo)
  ctx.fillStyle = "#ff8a1e";
  ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.55); ctx.lineTo(r * 0.5, -r * 0.55); ctx.lineTo(0, r * 1.15); ctx.closePath(); ctx.fill();
  // črte na korenčku
  ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 1.5;
  for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.18, -r * 0.3); ctx.lineTo(i * r * 0.12, r * 0.5); ctx.stroke(); }
  // listi
  ctx.fillStyle = "#2e9e5b";
  for (let k = -1; k <= 1; k++) {
    ctx.beginPath(); ctx.moveTo(0, -r * 0.5); ctx.lineTo(k * r * 0.35, -r * 1.25); ctx.lineTo(k * r * 0.35 + r * 0.14, -r * 0.5); ctx.fill();
  }
  // oči + zobki
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-r * 0.18, -r * 0.12, r * 0.13, 0, Math.PI * 2); ctx.arc(r * 0.18, -r * 0.12, r * 0.13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1a1a1a"; ctx.beginPath(); ctx.arc(-r * 0.18, -r * 0.12, r * 0.06, 0, Math.PI * 2); ctx.arc(r * 0.18, -r * 0.12, r * 0.06, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.moveTo(-r * 0.12, r * 0.12); ctx.lineTo(-r * 0.04, r * 0.28); ctx.lineTo(r * 0.04, r * 0.12); ctx.fill();
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
function drawClaw(b) {
  ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx));
  ctx.strokeStyle = "#ffe14d"; ctx.lineWidth = 3; ctx.lineCap = "round";
  for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(-b.r, k * 4); ctx.lineTo(b.r, k * 2.2); ctx.stroke(); }
  ctx.restore();
}
function drawBite() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(Math.atan2(player.fy, player.fx));
  ctx.globalAlpha = player.slashTimer / 12;
  const rr = player.r + 24;
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(0, 0, rr, -0.8, 0.8); ctx.stroke();
  ctx.fillStyle = "#fff";
  for (let a = -0.6; a <= 0.6; a += 0.3) { ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, 3, 0, Math.PI * 2); ctx.fill(); }
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
    ctx.fillStyle = "#ff8a1e"; ctx.fillRect(bx, by, bw * (boss.hp / boss.maxHp), 14);
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
  clearNight();
  drawCat(W * 0.74, H / 2 + 10, 46, -1, 0, frame * 0.2, false);
  ctx.fillStyle = "#fff"; ctx.textAlign = "left";
  ctx.font = 'bold 40px "Baloo 2", sans-serif'; ctx.fillText(G.introTitle, 56, 132);
  ctx.font = 'bold 38px "Baloo 2", sans-serif'; ctx.fillStyle = "#ff8a1e"; ctx.fillText(G.introSub, 56, 178);
  ctx.font = '18px "Baloo 2", sans-serif'; ctx.fillStyle = "#cdd6ea";
  ctx.fillText(G.introL1, 56, 244); ctx.fillText(G.introL2, 56, 272); ctx.fillText(G.introL3, 56, 300);
  ctx.fillStyle = "#ffe14d"; ctx.font = 'bold 22px "Baloo 2", sans-serif';
  ctx.fillText(G.introStart, 56, 396 + 4 * Math.sin(frame * 0.1));
}
function drawSelect() {
  clearNight();
  ctx.fillStyle = "#fff"; ctx.textAlign = "center";
  ctx.font = 'bold 40px "Baloo 2", sans-serif'; ctx.fillText(G.selectTitle, W / 2, 120);
  ctx.font = '17px "Baloo 2", sans-serif'; ctx.fillStyle = "#cdd6ea";
  ctx.fillText(G.selectHint, W / 2, 160);
  const bw = 460, bh = 80, bx = (W - bw) / 2;
  DIFFICULTIES.forEach((d, i) => {
    const by = 200 + i * 95; const sel = i === diffIndex;
    ctx.fillStyle = sel ? "#fff3c4" : "#fdfdf7"; ctx.strokeStyle = sel ? "#ff8a1e" : "#2b2b2b"; ctx.lineWidth = sel ? 5 : 3;
    roundRect(bx, by, bw, bh, 14); ctx.fill(); ctx.stroke();
    ctx.textAlign = "left"; ctx.fillStyle = "#1a1a1a"; ctx.font = 'bold 28px "Baloo 2", sans-serif';
    ctx.fillText((i + 1) + ". " + G.diffNames[i], bx + 24, by + 36);
    ctx.fillStyle = "#555"; ctx.font = '16px "Baloo 2", sans-serif'; ctx.fillText(G.diffDescs[i], bx + 24, by + 62);
    ctx.fillStyle = "#e23b3b"; ctx.textAlign = "right"; ctx.font = '20px sans-serif'; ctx.fillText("♥".repeat(d.hp), bx + bw - 20, by + 48);
  });
  ctx.textAlign = "center";
}
function drawStory() {
  clearNight();
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
  clearNight();
  drawBuildings();
  hearts.forEach((h) => drawHeart(h.x, h.y, 9));
  enemies.forEach(drawBat);
  if (boss) drawBat(boss);
  claws.forEach(drawClaw);
  if (player.slashTimer > 0) drawBite();
  drawCat(player.x, player.y, player.r, player.fx, player.fy, player.flap, player.invuln > 0 && Math.floor(frame / 4) % 2 === 0);
  drawParticles();
  drawFloatTexts();
  ctx.restore();

  drawHUD();
  if (bossWarn > 0 && Math.floor(frame / 8) % 2 === 0) {
    ctx.fillStyle = "#ff8a1e"; ctx.textAlign = "center"; ctx.font = 'bold 30px "Baloo 2", sans-serif';
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
function loop() { update(); render(); requestAnimationFrame(loop); }
loop();

/* ---------- mobilni akcijski gumbi (primarna = krempelj, sekundarna = ugriz) ---------- */
if (window.azvRegisterControls) {
  window.azvRegisterControls({
    primary: () => { initAudio(); if (state === STATE.PLAY) shoot(); },
    secondary: () => { initAudio(); if (state === STATE.PLAY) bite(); },
    primaryLabel: "🐾", secondaryLabel: "🦷", axis: "both",
  });
}
