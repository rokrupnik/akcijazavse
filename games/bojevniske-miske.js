/* ===========================================================
   BOJEVNIŠKE MIŠKE  (avtor zgodbe: Andrej)
   3D igra (Minecraft Dungeons slog) z matematičnimi nalogami.
   Izbereš bojevniško miš (matematična operacija), greš skozi naključni
   labirint mimo spečih mačk. Pri vsaki rešiš račune: vse prav = mačka spi
   in greš mimo; nekaj prav = mačka te opraska (izgubiš življenje, znova);
   premalo = mačka te poje (nazaj na začetek). Na koncu veliki boss in sir.

   Zgrajeno modularno: 3D pogon je v ./lib/iso-engine.js, kviz v
   ./lib/mathquiz.js; tu je vsebina (svet, modeli, pravila).
   =========================================================== */
import { IsoEngine, box, THREE } from "./lib/iso-engine.js";
import { runQuiz } from "./lib/mathquiz.js";

const canvas = document.getElementById("game");

/* ===========================================================
   NAKLJUČNI LABIRINT (vsako igro drugačen)
   - DFS zgradi labirint, najdaljša pot od starta = hodnik z zavoji
   =========================================================== */
const COLS = 7, ROWS = 9, CELL = 5;
function cellToWorld(r, c) {
  return { x: (c - (COLS - 1) / 2) * CELL, z: (r - (ROWS - 1) / 2) * CELL };
}
function worldToCell(x, z) {
  return { c: Math.round(x / CELL + (COLS - 1) / 2), r: Math.round(z / CELL + (ROWS - 1) / 2) };
}
function faceDir(from, to) {
  // model gleda privzeto v +Z; obrni proti celici "to"
  return Math.atan2(to.c - from.c, to.r - from.r);
}
function generateMaze() {
  const cells = [];
  for (let r = 0; r < ROWS; r++) { cells.push([]); for (let c = 0; c < COLS; c++) cells[r].push({ r, c, links: [], vis: false }); }
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const start = cells[ROWS - 1][Math.floor(COLS / 2)];
  start.vis = true;
  const stack = [start];
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const nbrs = [];
    for (const [dr, dc] of dirs) {
      const nr = cur.r + dr, nc = cur.c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !cells[nr][nc].vis) nbrs.push(cells[nr][nc]);
    }
    if (nbrs.length) {
      const n = nbrs[Math.floor(Math.random() * nbrs.length)];
      cur.links.push(n); n.links.push(cur); n.vis = true; stack.push(n);
    } else stack.pop();
  }
  // najdaljša pot od starta (BFS po drevesu) = naš hodnik
  const par = new Map(); par.set(start, null);
  const q = [start]; let last = start;
  while (q.length) { const cur = q.shift(); last = cur; for (const n of cur.links) if (!par.has(n)) { par.set(n, cur); q.push(n); } }
  const path = []; let c = last; while (c) { path.push(c); c = par.get(c); } path.reverse();
  return { cells, path };
}

const maze = generateMaze();
const cells = maze.cells;
const PATHI = new Map();                       // celica -> indeks na poti
maze.path.forEach((c, i) => PATHI.set(c, i));
function cellAt(r, c) { return (r >= 0 && r < ROWS && c >= 0 && c < COLS) ? cells[r][c] : null; }
// ali je sosed v smeri (dr,dc) NASLEDNJA/PREJŠNJA celica na poti (= odprtina hodnika)
function pathNeighbor(cell, dr, dc) {
  const n = cellAt(cell.r + dr, cell.c + dc);
  if (!n || !PATHI.has(n) || !PATHI.has(cell)) return false;
  return Math.abs(PATHI.get(cell) - PATHI.get(n)) === 1;
}

const WALL = 0.5;
const catBlocked = new Set();   // celice mačk, ki še blokirajo (dokler jih ne rešiš)
// robna kolizija: 1-širok hodnik; mačke ni mogoče obiti
function solid(x, z) {
  const c = Math.round(x / CELL + (COLS - 1) / 2);
  const r = Math.round(z / CELL + (ROWS - 1) / 2);
  const cell = cellAt(r, c);
  if (!cell || !PATHI.has(cell)) return true;          // izven hodnika = stena
  if (catBlocked.has(cell)) return true;               // speča mačka zapira pot
  const cx = (c - (COLS - 1) / 2) * CELL, cz = (r - (ROWS - 1) / 2) * CELL;
  const lx = x - cx, lz = z - cz, e = CELL / 2 - WALL / 2;
  if (lx > e && !pathNeighbor(cell, 0, 1)) return true;
  if (lx < -e && !pathNeighbor(cell, 0, -1)) return true;
  if (lz > e && !pathNeighbor(cell, 1, 0)) return true;
  if (lz < -e && !pathNeighbor(cell, -1, 0)) return true;
  return false;
}

/* ---------- pogon ---------- */
const engine = new IsoEngine(canvas, {
  viewSize: 8.5,
  bg: "#0c1322",
  camOffset: new THREE.Vector3(0, 18, 13.5),   // dvignjena kamera (pogled z višje), gor = gor
  solid,
  speed: 6.0,
  radius: 0.42,
});

/* ===========================================================
   GRADNJA SVETA (labirint iz kock)
   =========================================================== */
function buildWorld() {
  // temna podlaga pod vsem (da ni praznine)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(COLS * CELL + 30, ROWS * CELL + 30),
    new THREE.MeshLambertMaterial({ color: "#0a1020" })
  );
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.4, 0); ground.receiveShadow = true;
  engine.add(ground);

  const H = 2.4, CAP = 0.25;
  function wallSlab(x, z, w, d) {
    const wMesh = box(w, H, d, "#3c4258"); wMesh.position.set(x, H / 2, z); engine.add(wMesh);
    const cap = box(w, CAP, d, "#525d80", { cast: false }); cap.position.set(x, H + CAP / 2, z); engine.add(cap);
  }
  // 1-širok hodnik: tla na celicah poti + robne stene tam, kjer hodnik ne nadaljuje
  maze.path.forEach((cell) => {
    const cx = (cell.c - (COLS - 1) / 2) * CELL, cz = (cell.r - (ROWS - 1) / 2) * CELL;
    const col = (cell.r + cell.c) % 2 === 0 ? "#8d8470" : "#79715f";
    const tile = new THREE.Mesh(new THREE.PlaneGeometry(CELL, CELL), new THREE.MeshLambertMaterial({ color: col }));
    tile.rotation.x = -Math.PI / 2; tile.position.set(cx, 0.01, cz); tile.receiveShadow = true;
    engine.add(tile);
    const half = CELL / 2;
    if (!pathNeighbor(cell, 0, 1)) wallSlab(cx + half, cz, WALL, CELL + WALL);
    if (!pathNeighbor(cell, 0, -1)) wallSlab(cx - half, cz, WALL, CELL + WALL);
    if (!pathNeighbor(cell, 1, 0)) wallSlab(cx, cz + half, CELL + WALL, WALL);
    if (!pathNeighbor(cell, -1, 0)) wallSlab(cx, cz - half, CELL + WALL, WALL);
  });
}

/* lebdeč sirček ob mački (nežno se vrti; pobereš ga, ko prideš mimo) */
const cheeses = [];   // {group, cell, big, taken}
function addCheeseAt(cell, scale, big) {
  const w = cellToWorld(cell.r, cell.c);
  const ch = makeCheese(scale);
  ch.position.set(w.x, 0.25, w.z);
  ch.userData.baseY = 0.25;
  engine.add(ch);
  const rec = { group: ch, cell, big: !!big, taken: false };
  cheeses.push(rec);
  return rec;
}

/* ===========================================================
   MODELI (modularni — kocke + krogle, low-poly)
   =========================================================== */
function ball(r, color, opts = {}) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), new THREE.MeshLambertMaterial({ color }));
  m.castShadow = opts.cast !== false; m.receiveShadow = opts.receive !== false; return m;
}

/* znak računske operacije na prsih (iz belih kock) */
function chestEmblem(sym) {
  const g = new THREE.Group(); const C = "#ffffff", T = 0.055, DZ = 0.05;
  const bar = (w, h, rz) => { const b = box(w, h, DZ, C, { cast: false }); if (rz) b.rotation.z = rz; g.add(b); };
  const dot = (dy) => { const d = box(0.075, 0.075, DZ, C, { cast: false }); d.position.set(0, dy, 0); g.add(d); };
  if (sym === "+") { bar(0.26, T); bar(T, 0.26); }
  else if (sym === "−") { bar(0.26, T); }
  else if (sym === "×") { bar(0.28, T, Math.PI / 4); bar(0.28, T, -Math.PI / 4); }
  else if (sym === "÷") { bar(0.26, T); dot(0.13); dot(-0.13); }
  return g;
}

function makeMouse(opts = {}) {
  const fur = opts.fur || "#c7c1ba";
  const tunic = opts.tunic || "#3a7bd5";
  const g = new THREE.Group();
  // telo (jopič) + pas
  const body = box(0.6, 0.6, 0.48, tunic); body.position.y = 0.48; g.add(body);
  // znak operacije na prsih
  if (opts.sym) { const em = chestEmblem(opts.sym); em.position.set(0, 0.5, 0.26); g.add(em); }
  const belt = box(0.64, 0.1, 0.52, "#2a2a33", { cast: false }); belt.position.y = 0.3; g.add(belt);
  // glava (okrogla)
  const head = ball(0.33, fur); head.scale.set(1, 0.95, 1.05); head.position.set(0, 0.92, 0.16); g.add(head);
  const snout = ball(0.16, fur); snout.position.set(0, 0.84, 0.42); g.add(snout);
  const nose = ball(0.06, "#e98aa6", { cast: false }); nose.position.set(0, 0.84, 0.56); g.add(nose);
  // velika okrogla ušesa z rožnato sredino
  for (const sx of [-1, 1]) {
    const ear = ball(0.2, fur); ear.scale.set(1, 1, 0.5); ear.position.set(sx * 0.28, 1.16, 0.1); g.add(ear);
    const inner = ball(0.12, "#f0a9c0", { cast: false }); inner.scale.set(1, 1, 0.45); inner.position.set(sx * 0.28, 1.16, 0.16); g.add(inner);
  }
  // oči
  for (const sx of [-1, 1]) { const e = ball(0.055, "#1a1a1a", { cast: false }); e.position.set(sx * 0.13, 0.94, 0.42); g.add(e); }
  // brki
  for (const sx of [-1, 1]) for (const dy of [0.02, -0.05]) {
    const w = box(0.3, 0.012, 0.012, "#ded7cc", { cast: false }); w.position.set(sx * 0.3, 0.82 + dy, 0.46); w.rotation.y = sx * 0.35; g.add(w);
  }
  // rep
  const tail = box(0.09, 0.09, 0.5, "#e9b7c4"); tail.position.set(0, 0.28, -0.42); g.add(tail);
  // roke
  for (const sx of [-1, 1]) { const arm = box(0.15, 0.32, 0.15, tunic); arm.position.set(sx * 0.4, 0.48, 0.06); g.add(arm); }
  // ščit (leva roka)
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 16), new THREE.MeshLambertMaterial({ color: "#b5651d" }));
  shield.rotation.x = Math.PI / 2; shield.position.set(-0.5, 0.5, 0.2); shield.castShadow = true; g.add(shield);
  const sboss = ball(0.06, "#ffd23b", { cast: false }); sboss.position.set(-0.5, 0.5, 0.26); g.add(sboss);
  // meč (desna roka)
  const sword = new THREE.Group();
  const blade = box(0.07, 0.66, 0.07, "#e6ecf4"); blade.position.y = 0.33; sword.add(blade);
  const guard = box(0.26, 0.08, 0.1, "#c9952f"); guard.position.y = 0.02; sword.add(guard);
  const hilt = box(0.08, 0.18, 0.08, "#8a5a22"); hilt.position.y = -0.1; sword.add(hilt);
  sword.position.set(0.5, 0.56, 0.1); g.add(sword);
  // noge
  for (const sx of [-1, 1]) { const leg = box(0.18, 0.2, 0.22, "#5a4636"); leg.position.set(sx * 0.15, 0.1, 0.04); g.add(leg); }
  return g;
}

function makeCat(opts = {}) {
  const fur = opts.fur || "#caa46a";
  const inner = "#e7a6b4";
  const scale = opts.scale || 1;
  const g = new THREE.Group();
  // zvit "štruca" trup (nizek, zaobljen)
  const body = ball(0.62, fur); body.scale.set(1.05, 0.62, 1.15); body.position.set(0, 0.42, -0.05); g.add(body);
  // proge (temnejši odtenek krzna)
  for (let i = -1; i <= 1; i++) { const st = box(0.1, 0.5, 0.5, fur, { cast: false }); st.material.color.offsetHSL(0, 0, -0.1); st.position.set(i * 0.32, 0.55, -0.05); g.add(st); }
  // glava
  const head = ball(0.42, fur); head.position.set(0, 0.6, 0.62); g.add(head);
  // ušesa (trikotna) z rožnato
  for (const sx of [-1, 1]) {
    const ear = box(0.24, 0.28, 0.12, fur); ear.position.set(sx * 0.26, 0.98, 0.6); ear.rotation.z = sx * 0.2; g.add(ear);
    const ein = box(0.1, 0.14, 0.06, inner, { cast: false }); ein.position.set(sx * 0.26, 0.99, 0.67); g.add(ein);
  }
  // zaspane (zaprte) oči — rahlo navzdol zaprte
  for (const sx of [-1, 1]) {
    const eye = box(0.17, 0.05, 0.06, "#2e2218", { cast: false }); eye.position.set(sx * 0.17, 0.6, 0.99); eye.rotation.z = sx * 0.25; g.add(eye);
  }
  const nose = box(0.12, 0.09, 0.08, "#d56a86", { cast: false }); nose.position.set(0, 0.48, 1.0); g.add(nose);
  // tačke spredaj (podvite)
  for (const sx of [-1, 1]) { const paw = ball(0.16, fur); paw.scale.set(1, 0.7, 1.2); paw.position.set(sx * 0.28, 0.14, 0.7); g.add(paw); }
  // rep, ovit okoli telesa
  const tail = box(0.16, 0.16, 1.0, fur); tail.position.set(0.55, 0.2, -0.1); tail.rotation.y = 0.6; g.add(tail);
  const tailTip = ball(0.1, fur); tailTip.position.set(0.2, 0.2, 0.5); g.add(tailTip);
  // lebdeči "z z z" (spanje)
  const zG = new THREE.Group();
  [[0.0, 0.0, 0.16], [0.18, 0.28, 0.22], [0.4, 0.62, 0.3]].forEach((p) => {
    const z = box(p[2], 0.05, 0.05, "#ffffff", { cast: false }); z.position.set(0.5 + p[0], 1.2 + p[1], 0.4); z.rotation.z = 0.5;
    const z2 = box(0.05, p[2] * 0.9, 0.05, "#ffffff", { cast: false }); z2.position.set(0.5 + p[0], 1.2 + p[1] - p[2] * 0.4, 0.4); z2.rotation.z = -0.6;
    zG.add(z); zG.add(z2);
  });
  zG.name = "zzz"; g.add(zG);
  g.scale.setScalar(scale);
  return g;
}

function makeCheese(scale = 1) {
  const g = new THREE.Group();
  // klin (trikotna prizma)
  const wedge = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.62, 3, 1), new THREE.MeshLambertMaterial({ color: "#ffcf33" }));
  wedge.rotation.x = Math.PI / 2; wedge.rotation.z = Math.PI / 6; wedge.position.y = 0.4;
  wedge.castShadow = true; g.add(wedge);
  // luknje (temne pike)
  for (const p of [[-0.14, 0.42, 0.32], [0.16, 0.5, 0.32], [0.0, 0.3, 0.32], [-0.05, 0.45, -0.32]]) {
    const hole = ball(0.07, "#e0a800", { cast: false }); hole.position.set(p[0], p[1], p[2]); g.add(hole);
  }
  g.scale.setScalar(scale);
  return g;
}

/* ===========================================================
   POSTAVITEV
   =========================================================== */
buildWorld();

const PATH = maze.path;
const L = PATH.length;

// igralec (bojevniška miš) na začetku poti
const startW = cellToWorld(PATH[0].r, PATH[0].c);
let player = makeMouse({ fur: "#b9b3ad", tunic: "#3a7bd5" });
player.scale.setScalar(1.4);   // malo večja figura (boljša vidljivost)
player.position.set(startW.x, 0, startW.z);
engine.add(player);
engine.setPlayer(player);

// boss je na PREDZADNJI celici, največji sir na ZADNJI (za bossom).
// tri speče mačke razporejene po poti pred bossom; vsaka blokira hodnik in ima sirček za sabo
const bossIdx = L - 2;
const catIdx = [Math.floor(bossIdx * 0.30), Math.floor(bossIdx * 0.55), Math.floor(bossIdx * 0.80)];
const catFurs = ["#caa46a", "#b0b6bd", "#d59a6a"];
const catData = [];
catIdx.forEach((idx, i) => {
  const pc = PATH[idx], w = cellToWorld(pc.r, pc.c);
  const cat = makeCat({ fur: catFurs[i], scale: 1.3 + i * 0.07 });
  cat.position.set(w.x, 0, w.z);
  cat.rotation.y = faceDir(pc, PATH[idx - 1] || PATH[idx + 1]);
  engine.add(cat);
  addCheeseAt(PATH[idx + 1] || pc, 0.95, false);
  catData.push({ cell: pc, group: cat, solved: false, isBoss: false, count: 5, passMin: 2, num: i + 1 });
  catBlocked.add(pc);
});
const bossC = PATH[bossIdx];
const boss = makeCat({ fur: "#8a8f98", scale: 2.2 });
const bw = cellToWorld(bossC.r, bossC.c);
boss.position.set(bw.x, 0, bw.z);
boss.rotation.y = faceDir(bossC, PATH[bossIdx - 1] || bossC);
engine.add(boss);
addCheeseAt(PATH[L - 1], 2.0, true);   // največji sir za bossom
catData.push({ cell: bossC, group: boss, solved: false, isBoss: true, count: 10, passMin: 4, num: 0 });
catBlocked.add(bossC);

/* ===========================================================
   IGRA: izbira miške, težavnost, življenja, srečanja, zmaga
   =========================================================== */
const LANG = (typeof localStorage !== "undefined" && localStorage.getItem("azv-lang") === "en") ? "en" : "sl";
const overlay = document.getElementById("ui-overlay");

/* ---------- zvok (WebAudio, brez datotek) ---------- */
let actx = null;
function ac() { try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === "suspended") actx.resume(); } catch (e) {} return actx; }
function beep(f, dur, type, vol, slide) {
  const a = ac(); if (!a) return;
  const t = a.currentTime, o = a.createOscillator(), g = a.createGain();
  o.type = type || "square"; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(1, slide), t + dur);
  g.gain.setValueAtTime(vol || 0.15, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol) {
  const a = ac(); if (!a) return;
  const t = a.currentTime, buf = a.createBuffer(1, Math.max(1, a.sampleRate * dur), a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = a.createBufferSource(); s.buffer = buf; const g = a.createGain();
  g.gain.setValueAtTime(vol || 0.1, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(g).connect(a.destination); s.start(t);
}
function seq(notes, gap, type, vol) { notes.forEach((f, i) => setTimeout(() => beep(f, gap * 1.5, type, vol), i * gap * 1000)); }
const SFX = {
  click() { beep(520, 0.05, "square", 0.1, 720); },
  encounter() { beep(170, 0.28, "sawtooth", 0.13, 90); noise(0.12, 0.05); },     // mačka zasluti
  pass() { seq([523, 659, 784, 1047], 0.09, "triangle", 0.16); },                // spi naprej
  scratch() { noise(0.16, 0.16); beep(720, 0.12, "sawtooth", 0.12, 300); },      // praska
  eat() { beep(150, 0.3, "sawtooth", 0.2, 60); noise(0.22, 0.12); },             // poje
  cheese() { seq([784, 988, 1319], 0.07, "triangle", 0.16); },                   // mljask
  win() { seq([523, 659, 784, 1047, 1319, 1568], 0.13, "triangle", 0.2); },
  over() { seq([400, 330, 260, 180], 0.16, "sawtooth", 0.18); },
};

/* ---------- glasba v ozadju (mirna med hojo, napeta med računanjem) ---------- */
const Music = (function () {
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  // mirna (durova pentatonika)
  const EX_MEL = [72, -1, 79, -1, 76, -1, 74, -1, 72, -1, 67, -1, 69, -1, 71, -1];
  const EX_BASS = [48, -1, -1, -1, 55, -1, -1, -1, 53, -1, -1, -1, 55, -1, -1, -1];
  // napeta (molova, gostejša, hitrejša)
  const BT_MEL = [69, 72, 71, 69, 67, 69, 71, 72, 69, 67, 65, 64, 65, 67, 69, 71];
  const BT_BASS = [45, 45, -1, 45, 48, 48, -1, 48, 41, 41, -1, 41, 43, 43, -1, 43];

  let timer = null, nextT = 0, step = 0, mood = "explore", master = null, started = false, muted = false, vol = 0.42;

  function tone(freq, t, dur, type, v) {
    const a = ac(); if (!a || !master) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function playStep(s, t) {
    if (mood === "explore") {
      if (EX_MEL[s] > 0) tone(mtof(EX_MEL[s]), t, 0.5, "triangle", 0.085);
      if (EX_BASS[s] > 0) tone(mtof(EX_BASS[s]), t, 0.7, "sine", 0.11);
    } else {
      if (BT_MEL[s] > 0) tone(mtof(BT_MEL[s]), t, 0.16, "square", 0.055);
      if (BT_BASS[s] > 0) tone(mtof(BT_BASS[s]), t, 0.18, "sawtooth", 0.085);
    }
  }
  function scheduler() {
    const a = ac(); if (!a) return;
    while (nextT < a.currentTime + 0.12) {
      playStep(step, nextT);
      nextT += (mood === "battle") ? 0.15 : 0.28;   // tempo: napeta hitrejša
      step = (step + 1) % 16;
    }
  }
  return {
    start() {
      const a = ac(); if (!a || started) return; started = true;
      master = a.createGain(); master.gain.value = 0; master.connect(a.destination);
      master.gain.linearRampToValueAtTime(muted ? 0 : vol, a.currentTime + 1.2);
      nextT = a.currentTime + 0.1; step = 0;
      timer = setInterval(scheduler, 25);
    },
    setMood(m) { mood = m; },
    toggleMute() {
      muted = !muted; const a = ac();
      if (master && a) master.gain.linearRampToValueAtTime(muted ? 0 : vol, a.currentTime + 0.2);
      return !muted;
    },
  };
})();

const MICE = [
  { op: "add", sym: "+", name: { sl: "Plusko", en: "Plusko" }, tunic: "#3a7bd5", desc: { sl: "seštevanje", en: "addition" } },
  { op: "sub", sym: "−", name: { sl: "Minka", en: "Minka" }, tunic: "#e2663b", desc: { sl: "odštevanje", en: "subtraction" } },
  { op: "mul", sym: "×", name: { sl: "Krat", en: "Krat" }, tunic: "#7a4ed0", desc: { sl: "množenje", en: "multiplication" } },
  { op: "div", sym: "÷", name: { sl: "Delko", en: "Delko" }, tunic: "#2ca06a", desc: { sl: "deljenje", en: "division" } },
];
const DIFFS = [
  { id: "easy", name: { sl: "LAHKO", en: "EASY" }, lives: 5, range: { add: 10, sub: 10, mul: 5, div: 5 } },
  { id: "med", name: { sl: "SREDNJE", en: "MEDIUM" }, lives: 4, range: { add: 20, sub: 20, mul: 10, div: 10 } },
  { id: "hard", name: { sl: "TEŽKO", en: "HARD" }, lives: 3, range: { add: 100, sub: 100, mul: 12, div: 12 } },
];
const T = {
  sl: {
    pickMouse: "Izberi bojevniško miš", pickMouseSub: "Vsaka se bori z drugo računsko operacijo",
    pickDiff: "Izberi težavnost", lives: "življenja", upTo: "računi do",
    catTitle: (n) => "Speča mačka " + n + " / 3", bossTitle: "VELIKA MAČKA 😼",
    opSub: (o) => "Reši račune (" + o + ")",
    pass: "Vse pravilno! 😴 Mačka spi naprej — greš mimo.",
    scratch: "Mačka se je zbudila in te opraskala! 🐱💢  −1 življenje. Poskusi znova.",
    eat: "Ojoj! Mačka te je pojedla 😼  −1 življenje. Nazaj na začetek labirinta.",
    next: "Naprej", retry: "Znova",
    win: "ZMAGA! 🧀🎉", winSub: "Premagal si veliko mačko in dobil VELIKI SIR! Bravo!",
    over: "KONEC 💔", overSub: "Zmanjkalo ti je življenj.",
    again: "Še enkrat",
    start: "Začni",
    title: "BOJEVNIŠKE MIŠKE", tagline: "Pogumne miške, ki se borijo z matematiko!",
    start2: "Izberi miš 🐭",
    story: [
      "V Mišjem kraljestvu je največji zaklad VELIKI SIR. 🧀",
      "A zastražile so ga lene mačke, ki dremajo po labirintu Mačjega gradu. 😼",
      "Le najpogumnejše bojevniške miške se upajo mimo — z močjo MATEMATIKE! ⚔️",
      "Izberi svojo miš in se prebij do velikega sira. Pogum, bojevnik!",
    ],
  },
  en: {
    pickMouse: "Choose a warrior mouse", pickMouseSub: "Each fights with a different math operation",
    pickDiff: "Choose difficulty", lives: "lives", upTo: "numbers up to",
    catTitle: (n) => "Sleeping cat " + n + " / 3", bossTitle: "BIG CAT 😼",
    opSub: (o) => "Solve the problems (" + o + ")",
    pass: "All correct! 😴 The cat sleeps on — you pass.",
    scratch: "The cat woke up and scratched you! 🐱💢  −1 life. Try again.",
    eat: "Oh no! The cat ate you 😼  −1 life. Back to the start of the maze.",
    next: "Next", retry: "Again",
    win: "VICTORY! 🧀🎉", winSub: "You beat the big cat and got the BIG CHEESE! Well done!",
    over: "GAME OVER 💔", overSub: "You ran out of lives.",
    again: "Play again",
    start: "Start",
    title: "WARRIOR MICE", tagline: "Brave mice who fight with math!",
    start2: "Choose a mouse 🐭",
    story: [
      "In the Mouse Kingdom the greatest treasure is the BIG CHEESE. 🧀",
      "But lazy cats guard it, dozing through the maze of Cat Castle. 😼",
      "Only the bravest warrior mice dare to pass — with the power of MATH! ⚔️",
      "Choose your mouse and fight your way to the big cheese. Be brave, warrior!",
    ],
  },
}[LANG];

let chosenMouse = MICE[0], diff = DIFFS[0], lives = 5, gameOn = false, inEncounter = false;

/* ---- CSS za zaslone + HUD ---- */
(function injectUi() {
  const s = document.createElement("style");
  s.textContent = `
  #ui-overlay{position:absolute;inset:0;display:none;align-items:center;justify-content:center;z-index:10;padding:10px;}
  #ui-overlay.show{display:flex;}
  .bm-card{background:#fdfdf7;border:5px solid #2b2b2b;border-radius:20px;padding:18px 22px;width:min(88%,560px);
    box-shadow:0 10px 30px rgba(0,0,0,.45);font-family:"Baloo 2",sans-serif;text-align:center;color:#1a1a1a;}
  .bm-h{font-weight:800;font-size:24px;margin:0 0 4px;}
  .bm-sub{color:#666;font-size:14px;margin:0 0 14px;}
  .bm-selrow{display:flex;gap:12px;align-items:stretch;flex-wrap:wrap;justify-content:center;}
  .bm-mice{display:flex;flex-direction:column;gap:8px;flex:1 1 240px;min-width:230px;}
  .bm-mouse{display:flex;align-items:center;gap:12px;padding:10px;border-radius:14px;border:3px solid #2b2b2b;background:#fff;cursor:pointer;text-align:left;font-family:inherit;}
  .bm-mouse:active{transform:scale(.98);}
  .bm-mouse.on{border-color:#2f6fe0;background:#e7f0ff;box-shadow:0 0 0 3px rgba(47,111,224,.45) inset;}
  .bm-prevwrap{flex:0 0 180px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#eef2f8;border-radius:16px;border:3px solid #2b2b2b;padding:6px;}
  .bm-prev{width:170px;height:185px;display:block;}
  .bm-prevname{font-weight:800;font-size:16px;color:#1a1a1a;margin-top:2px;}
  .bm-sym{width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:30px;font-weight:800;flex:0 0 auto;}
  .bm-mname{font-weight:800;font-size:20px;} .bm-mdesc{color:#666;font-size:13px;}
  .bm-diffs{display:flex;flex-direction:column;gap:10px;}
  .bm-diff{font-family:inherit;font-weight:800;font-size:22px;padding:12px 14px;border-radius:14px;border:3px solid #2b2b2b;background:#eaf1ff;cursor:pointer;display:flex;justify-content:space-between;align-items:center;text-align:left;}
  .bm-diff:active{transform:scale(.98);}
  .bm-diffsub{font-size:13px;color:#666;font-weight:400;margin-top:2px;}
  .bm-btn{font-family:inherit;font-weight:800;font-size:20px;padding:12px 26px;border-radius:14px;border:3px solid #2b2b2b;background:#ffd23b;cursor:pointer;margin-top:14px;}
  .bm-btn:active{transform:scale(.97);}
  .bm-msg{font-size:20px;margin:6px 0 4px;line-height:1.4;}
  .bm-hud{position:absolute;top:10px;left:12px;z-index:8;font-family:"Baloo 2",sans-serif;font-size:22px;
    background:rgba(0,0,0,.35);color:#fff;padding:4px 12px;border-radius:20px;letter-spacing:2px;display:none;}
  .bm-music{position:absolute;top:10px;right:12px;z-index:8;width:38px;height:38px;border:none;border-radius:50%;
    background:rgba(0,0,0,.35);color:#fff;font-size:18px;cursor:pointer;display:none;}
  /* celozaslonsko: mute pod izhodni gumb (da se ne prekrivata) */
  body.azv-fs .bm-music{top:66px;}
  /* celozaslonsko: 3D platno naj ZAPOLNI zaslon (kamera se prilagodi) — ne ohranjaj razmerja */
  #stage:fullscreen canvas#game, #stage:-webkit-full-screen canvas#game,
  body.azv-pseudofs #stage canvas#game{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;}
  `;
  document.head.appendChild(s);
})();

const hud = document.createElement("div");
hud.className = "bm-hud";
document.getElementById("stage").appendChild(hud);
// gumb za glasbo (vklop/izklop)
const musicBtn = document.createElement("button");
musicBtn.className = "bm-music"; musicBtn.textContent = "🔊"; musicBtn.title = "Glasba";
document.getElementById("stage").appendChild(musicBtn);
musicBtn.addEventListener("click", () => { musicBtn.textContent = Music.toggleMute() ? "🔊" : "🔇"; });
function updateHud() { hud.style.display = gameOn ? "block" : "none"; hud.textContent = "❤".repeat(Math.max(0, lives)) + "🖤".repeat(Math.max(0, (diff.lives - lives))); }

function showScreen(html) { overlay.innerHTML = '<div class="bm-card">' + html + "</div>"; overlay.classList.add("show"); return overlay.querySelector(".bm-card"); }
function hideScreen() { overlay.classList.remove("show"); overlay.innerHTML = ""; }

/* ---- naslovnica + zgodba ---- */
function showIntro() {
  engine.paused = true; gameOn = false; updateHud();
  const card = showScreen('<div style="font-size:56px;line-height:1.1;margin-bottom:2px">🐭⚔️</div>' +
    '<div class="bm-h" style="font-size:30px">' + T.title + '</div><div class="bm-sub">' + T.tagline + "</div>");
  const b = document.createElement("button"); b.className = "bm-btn"; b.textContent = T.start;
  b.onclick = () => { SFX.click(); showStory(0); };
  card.appendChild(b);
}
function showStory(i) {
  if (i >= T.story.length) { showMouseSelect(); return; }
  const card = showScreen('<div class="bm-sub">' + (i + 1) + " / " + T.story.length + '</div><div class="bm-msg">' + T.story[i] + "</div>");
  const b = document.createElement("button"); b.className = "bm-btn";
  b.textContent = (i === T.story.length - 1) ? T.start2 : T.next;
  b.onclick = () => { SFX.click(); showStory(i + 1); };
  card.appendChild(b);
}
/* ---- vrteči 3D predogled miši (lastni mini-renderer) ---- */
let preview = null;
function getPreview() {
  if (preview) return preview;
  const cv = document.createElement("canvas"); cv.className = "bm-prev"; cv.width = 240; cv.height = 260;
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); r.setSize(240, 260, false);
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xffffff, 0x556070, 1.05));
  const dl = new THREE.DirectionalLight(0xffffff, 0.7); dl.position.set(3, 6, 4); sc.add(dl);
  const cam = new THREE.PerspectiveCamera(35, 240 / 260, 0.1, 50);
  cam.position.set(0, 1.4, 3.6); cam.lookAt(0, 0.72, 0);
  const holder = new THREE.Group(); sc.add(holder);
  let raf = null;
  function loop() { holder.rotation.y += 0.02; r.render(sc, cam); raf = requestAnimationFrame(loop); }
  preview = {
    canvas: cv,
    setMouse(m) { while (holder.children.length) holder.remove(holder.children[0]); holder.add(makeMouse({ fur: "#c7c1ba", tunic: m.tunic, sym: m.sym })); },
    start() { if (!raf) loop(); },
    stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } },
  };
  return preview;
}
/* prezgradi igralčevo miš z izbrano barvo + znakom operacije */
function setMouseModel(m) {
  const pos = player.position.clone(), rotY = player.rotation.y, sc = player.scale.x;
  engine.remove(player);
  player = makeMouse({ fur: "#c7c1ba", tunic: m.tunic, sym: m.sym });
  player.scale.setScalar(sc); player.position.copy(pos); player.rotation.y = rotY;
  engine.add(player); engine.setPlayer(player);
}

/* ---- izbira miške (z vrtečim predogledom) ---- */
function showMouseSelect() {
  engine.paused = true; gameOn = false; updateHud();
  const card = showScreen('<div class="bm-h">' + T.pickMouse + '</div><div class="bm-sub">' + T.pickMouseSub +
    '</div><div class="bm-selrow"><div class="bm-mice"></div>' +
    '<div class="bm-prevwrap"><div class="bm-prevname"></div></div></div>');
  const grid = card.querySelector(".bm-mice");
  const prevWrap = card.querySelector(".bm-prevwrap");
  const nameEl = card.querySelector(".bm-prevname");
  const prev = getPreview();
  prevWrap.insertBefore(prev.canvas, nameEl);
  prev.start();
  let sel = chosenMouse || MICE[0];
  const buttons = [];
  function select(m) {
    sel = m; prev.setMouse(m);
    nameEl.textContent = m.name[LANG] + "  " + m.sym;
    buttons.forEach((b, i) => b.classList.toggle("on", MICE[i] === m));
  }
  MICE.forEach((m) => {
    const b = document.createElement("button"); b.className = "bm-mouse";
    b.innerHTML = '<span class="bm-sym" style="background:' + m.tunic + '">' + m.sym + '</span><span><div class="bm-mname">' + m.name[LANG] + '</div><div class="bm-mdesc">' + m.desc[LANG] + '</div></span>';
    b.onclick = () => { SFX.click(); select(m); };
    grid.appendChild(b); buttons.push(b);
  });
  select(sel);
  const go = document.createElement("button"); go.className = "bm-btn"; go.textContent = T.next + " ▶";
  go.onclick = () => { SFX.click(); chosenMouse = sel; setMouseModel(sel); prev.stop(); showDiffSelect(); };
  card.appendChild(go);
}
/* ---- izbira težavnosti ---- */
function showDiffSelect() {
  const card = showScreen('<div class="bm-h">' + T.pickDiff + '</div><div class="bm-diffs"></div>');
  const list = card.querySelector(".bm-diffs");
  DIFFS.forEach((d) => {
    const b = document.createElement("button"); b.className = "bm-diff";
    b.innerHTML = "<span><div>" + d.name[LANG] + '</div><div class="bm-diffsub">' + T.upTo + " " + d.range[chosenMouse.op] + " (" + chosenMouse.sym + ")</div></span>" +
      '<span style="color:#e23b3b">' + "❤".repeat(d.lives) + "</span>";
    b.onclick = () => { SFX.click(); diff = d; lives = d.lives; startGame(); };
    list.appendChild(b);
  });
}
/* ---- začetek igre ---- */
function startGame() {
  hideScreen(); gameOn = true; inEncounter = false; engine.paused = false; updateHud();
  musicBtn.style.display = "block";
  Music.start(); Music.setMood("explore");
}
/* ---- sporočilo (rezultat srečanja) ---- */
function showMessage(msg, btnLabel) {
  return new Promise((resolve) => {
    const card = showScreen('<div class="bm-msg">' + msg + '</div>');
    const b = document.createElement("button"); b.className = "bm-btn"; b.textContent = btnLabel;
    b.onclick = () => { SFX.click(); hideScreen(); resolve(); };
    card.appendChild(b);
  });
}

/* ---- pravila srečanja ---- */
function loseLife() { lives--; updateHud(); }
function rangeFor(op) { return diff.range[op]; }

function resetToStart() {
  // nazaj na začetek labirinta — vse mačke spet nerešene in blokirajo pot
  catData.forEach((cat) => { cat.solved = false; catBlocked.add(cat.cell); });
  const w = cellToWorld(PATH[0].r, PATH[0].c);
  player.position.set(w.x, 0, w.z);
  engine.camTarget.set(w.x, 0, w.z);
}

async function startEncounter(cat) {
  inEncounter = true; engine.paused = true;
  SFX.encounter(); Music.setMood("battle");   // glasba postane napeta
  const title = cat.isBoss ? T.bossTitle : T.catTitle(cat.num);
  const sub = T.opSub(chosenMouse.sym);
  while (true) {
    const { correct } = await runQuiz({ mount: overlay, op: chosenMouse.op, count: cat.count, range: rangeFor(chosenMouse.op), title, sub, lang: LANG });
    if (correct === cat.count) {                    // vse pravilno → mimo
      cat.solved = true;
      catBlocked.delete(cat.cell);
      SFX.pass();
      await showMessage(T.pass, T.next);
      break;
    }
    if (correct >= cat.passMin) {                   // opraskan → izgubi življenje, znova
      loseLife(); SFX.scratch();
      if (lives <= 0) { await gameOver(); return; }
      await showMessage(T.scratch, T.retry);
      continue;
    }
    // pojeden → izgubi življenje, nazaj na začetek
    loseLife(); SFX.eat();
    if (lives <= 0) { await gameOver(); return; }
    await showMessage(T.eat, T.next);
    resetToStart();
    break;
  }
  inEncounter = false; engine.paused = false;
  Music.setMood("explore");   // nazaj na mirno
}

async function gameOver() {
  SFX.over(); Music.setMood("explore");
  const card = showScreen('<div class="bm-h">' + T.over + '</div><div class="bm-sub">' + T.overSub + "</div>");
  const b = document.createElement("button"); b.className = "bm-btn"; b.textContent = T.again;
  b.onclick = () => location.reload();
  card.appendChild(b);
}
async function win() {
  gameOn = false; updateHud();
  SFX.win(); Music.setMood("explore");
  const card = showScreen('<div class="bm-h">' + T.win + '</div><div class="bm-sub">' + T.winSub + "</div>");
  const b = document.createElement("button"); b.className = "bm-btn"; b.textContent = T.again;
  b.onclick = () => location.reload();
  card.appendChild(b);
}

/* ---- glavna zanka igre: vrtenje sirčkov, sprožitev srečanj, pobiranje sira ---- */
engine.onStep = () => {
  const t = performance.now();
  cheeses.forEach((c, i) => { if (!c.taken) { c.group.rotation.y += 0.02; c.group.position.y = c.group.userData.baseY + Math.sin(t * 0.003 + i) * 0.08; } });
  if (!gameOn || inEncounter || engine.paused) return;
  const p = player.position;
  // sprožitev srečanja ob speči mački: miš mora biti na celici, ki je PO HODNIKU
  // povezana z mačjo celico (brez stene vmes) IN dovolj blizu
  const pc = worldToCell(p.x, p.z);
  const pcell = cellAt(pc.r, pc.c);
  for (const cat of catData) {
    if (cat.solved) continue;
    if (!pcell || !PATHI.has(pcell) || !PATHI.has(cat.cell)) continue;
    if (Math.abs(PATHI.get(pcell) - PATHI.get(cat.cell)) !== 1) continue;   // ni sosednja po poti = stena vmes
    const w = cellToWorld(cat.cell.r, cat.cell.c);
    if (Math.hypot(p.x - w.x, p.z - w.z) < CELL * 0.95) {
      startEncounter(cat);
      return;
    }
  }
  // pobiranje sirčkov
  for (const c of cheeses) {
    if (c.taken) continue;
    const w = cellToWorld(c.cell.r, c.cell.c);
    if (Math.hypot(p.x - w.x, p.z - w.z) < 1.6) {
      c.taken = true; engine.remove(c.group);
      if (c.big) win(); else SFX.cheese();
    }
  }
};

engine.start();
showIntro();

/* ---------- mobilno: skrij akcijska gumba (premik je joystick) ---------- */
(function () {
  const hide = (sel) => { const el = document.querySelector(sel); if (el) el.style.display = "none"; };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => hide(".game-controls"));
  else hide(".game-controls");
})();

/* ob preklopu celozaslonskega zanesljivo osveži velikost 3D platna (tudi pri pseudo-fs na iPhonu,
   kjer ni resize dogodka) — sproži window resize, ki ga pogon obdela */
(function () {
  const ping = () => [80, 350, 700].forEach((d) => setTimeout(() => window.dispatchEvent(new Event("resize")), d));
  document.querySelectorAll(".fs-enter, .fs-exit").forEach((b) => b.addEventListener("click", ping));
})();
