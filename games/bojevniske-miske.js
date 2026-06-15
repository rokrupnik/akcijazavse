/* ===========================================================
   BOJEVNIŠKE MIŠKE  (avtor zgodbe: Andrej)
   3D igra (Minecraft Dungeons slog) z matematičnimi nalogami.
   MEJNIK 1: gozd/grad-hodnik, premična miš, diagonalna kamera,
   speče mačke in veliki boss s sirčkom. Matematična srečanja
   pridejo v naslednjem koraku.

   Zgrajeno modularno: 3D pogon je v ./lib/iso-engine.js,
   tu je le vsebina (svet, modeli, postavitev).
   =========================================================== */
import { IsoEngine, box, THREE } from "./lib/iso-engine.js";

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
// robna kolizija: 1-širok hodnik; mačke ni mogoče obiti
function solid(x, z) {
  const c = Math.round(x / CELL + (COLS - 1) / 2);
  const r = Math.round(z / CELL + (ROWS - 1) / 2);
  const cell = cellAt(r, c);
  if (!cell || !PATHI.has(cell)) return true;          // izven hodnika = stena
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
  camOffset: new THREE.Vector3(0, 15, 16),   // nagib ~43° (več globine/3D), gor = gor
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

/* lebdeč sirček ob mački (nežno se vrti — animira ga engine.onStep) */
const spinners = [];
function addCheeseAt(cell, scale) {
  const w = cellToWorld(cell.r, cell.c);
  const ch = makeCheese(scale);
  ch.position.set(w.x, 0.25, w.z);
  ch.userData.baseY = 0.25;
  engine.add(ch);
  spinners.push(ch);
  return ch;
}

/* ===========================================================
   MODELI (modularni — kocke)
   =========================================================== */
function makeMouse(opts = {}) {
  const fur = opts.fur || "#b9b3ad";
  const tunic = opts.tunic || "#3a7bd5";
  const g = new THREE.Group();
  // telo (jopič)
  const body = box(0.62, 0.62, 0.5, tunic); body.position.y = 0.5; g.add(body);
  // glava (spredaj = +Z)
  const head = box(0.5, 0.46, 0.42, fur); head.position.set(0, 0.78, 0.28); g.add(head);
  // smrček
  const snout = box(0.22, 0.2, 0.2, fur); snout.position.set(0, 0.72, 0.5); g.add(snout);
  const nose = box(0.08, 0.08, 0.08, "#e98aa6", { cast: false }); nose.position.set(0, 0.72, 0.62); g.add(nose);
  // ušesa (rožnata)
  for (const sx of [-1, 1]) {
    const ear = box(0.26, 0.26, 0.06, "#f0a9c0"); ear.position.set(sx * 0.24, 1.02, 0.22); g.add(ear);
  }
  // oči
  for (const sx of [-1, 1]) {
    const eye = box(0.07, 0.07, 0.06, "#1a1a1a", { cast: false }); eye.position.set(sx * 0.13, 0.82, 0.49); g.add(eye);
  }
  // rep (zadaj)
  const tail = box(0.1, 0.1, 0.5, "#e9b7c4"); tail.position.set(0, 0.3, -0.42); g.add(tail);
  // roke
  for (const sx of [-1, 1]) {
    const arm = box(0.16, 0.34, 0.16, tunic); arm.position.set(sx * 0.4, 0.5, 0.06); g.add(arm);
  }
  // meč v desni roki
  const sword = new THREE.Group();
  const blade = box(0.08, 0.66, 0.08, "#dfe6ef"); blade.position.y = 0.33; sword.add(blade);
  const guard = box(0.28, 0.08, 0.1, "#b88a2a"); guard.position.y = 0.02; sword.add(guard);
  const hilt = box(0.08, 0.18, 0.08, "#8a5a22"); hilt.position.y = -0.1; sword.add(hilt);
  sword.position.set(0.5, 0.55, 0.1);
  g.add(sword);
  // noge
  for (const sx of [-1, 1]) {
    const leg = box(0.18, 0.2, 0.2, "#5a4636"); leg.position.set(sx * 0.16, 0.1, 0.02); g.add(leg);
  }
  return g;
}

function makeCat(opts = {}) {
  const fur = opts.fur || "#caa46a";
  const scale = opts.scale || 1;
  const g = new THREE.Group();
  // ležeče/zvito telo
  const body = box(1.0, 0.6, 1.3, fur); body.position.y = 0.35; g.add(body);
  // glava
  const head = box(0.7, 0.6, 0.6, fur); head.position.set(0, 0.55, 0.78); g.add(head);
  // ušesa
  for (const sx of [-1, 1]) {
    const ear = box(0.22, 0.26, 0.14, fur); ear.position.set(sx * 0.24, 0.95, 0.7); g.add(ear);
    const inner = box(0.1, 0.14, 0.06, "#e7a6b4", { cast: false }); inner.position.set(sx * 0.24, 0.95, 0.78); g.add(inner);
  }
  // zaprte oči (črti)
  for (const sx of [-1, 1]) {
    const eye = box(0.18, 0.04, 0.06, "#3a2a1a", { cast: false }); eye.position.set(sx * 0.17, 0.58, 1.08); g.add(eye);
  }
  // smrček
  const nose = box(0.12, 0.1, 0.08, "#d56a86", { cast: false }); nose.position.set(0, 0.45, 1.12); g.add(nose);
  // proge
  for (let i = -1; i <= 1; i++) {
    const stripe = box(0.12, 0.62, 0.14, "#a07f4e", { cast: false }); stripe.position.set(i * 0.3, 0.36, 0.1); g.add(stripe);
  }
  // rep, ovit naokoli
  const tail = box(0.16, 0.16, 0.9, fur); tail.position.set(0.5, 0.2, -0.3); tail.rotation.y = 0.5; g.add(tail);
  // tačke spredaj
  for (const sx of [-1, 1]) {
    const paw = box(0.24, 0.18, 0.3, fur); paw.position.set(sx * 0.3, 0.12, 0.95); g.add(paw);
  }
  g.scale.setScalar(scale);
  return g;
}

function makeCheese(scale = 1) {
  const g = new THREE.Group();
  const wedge = box(0.7, 0.5, 0.7, "#ffcf33"); wedge.position.y = 0.35; g.add(wedge);
  // luknje
  for (const p of [[-0.2, 0.4, 0.2], [0.18, 0.5, -0.1], [0.05, 0.25, 0.25]]) {
    const hole = box(0.12, 0.12, 0.12, "#e0a800", { cast: false });
    hole.position.set(p[0], p[1], p[2]); g.add(hole);
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
const player = makeMouse({ fur: "#b9b3ad", tunic: "#3a7bd5" });
player.position.set(startW.x, 0, startW.z);
engine.add(player);
engine.setPlayer(player);

// boss je na PREDZADNJI celici, največji sir na ZADNJI (za bossom) — kot pri malih mačkah.
// tri speče mačke razporejene po poti pred bossom; vsaka ima sirček na naslednji celici
const bossIdx = L - 2;
const catIdx = [Math.floor(bossIdx * 0.30), Math.floor(bossIdx * 0.55), Math.floor(bossIdx * 0.80)];
const catFurs = ["#caa46a", "#b0b6bd", "#d59a6a"];
catIdx.forEach((idx, i) => {
  const pc = PATH[idx], w = cellToWorld(pc.r, pc.c);
  const cat = makeCat({ fur: catFurs[i], scale: 1.0 + i * 0.05 });
  cat.position.set(w.x, 0, w.z);
  cat.rotation.y = faceDir(pc, PATH[idx - 1] || PATH[idx + 1]);
  engine.add(cat);
  // sirček na naslednji celici poti (za mačko)
  addCheeseAt(PATH[idx + 1] || pc, 0.7);
});

// veliki boss (predzadnja celica) + NAJVEČJI sir na celici ZA njim
const bossC = PATH[bossIdx];
const boss = makeCat({ fur: "#8a8f98", scale: 1.8 });
const bw = cellToWorld(bossC.r, bossC.c);
boss.position.set(bw.x, 0, bw.z);
boss.rotation.y = faceDir(bossC, PATH[bossIdx - 1] || bossC);
engine.add(boss);
addCheeseAt(PATH[L - 1], 1.6);   // največji sir za bossom

// nežno vrtenje vseh sirčkov
engine.onStep = () => {
  const t = performance.now();
  spinners.forEach((ch, i) => { ch.rotation.y += 0.02; ch.position.y = ch.userData.baseY + Math.sin(t * 0.003 + i) * 0.08; });
};

engine.start();

/* ---------- mobilno: skrij akcijska gumba (premik je joystick) ---------- */
(function () {
  const hide = (sel) => { const el = document.querySelector(sel); if (el) el.style.display = "none"; };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => hide(".game-controls"));
  else hide(".game-controls");
})();
