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

// boss je na PREDZADNJI celici, največji sir na ZADNJI (za bossom).
// tri speče mačke razporejene po poti pred bossom; vsaka blokira hodnik in ima sirček za sabo
const bossIdx = L - 2;
const catIdx = [Math.floor(bossIdx * 0.30), Math.floor(bossIdx * 0.55), Math.floor(bossIdx * 0.80)];
const catFurs = ["#caa46a", "#b0b6bd", "#d59a6a"];
const catData = [];
catIdx.forEach((idx, i) => {
  const pc = PATH[idx], w = cellToWorld(pc.r, pc.c);
  const cat = makeCat({ fur: catFurs[i], scale: 1.0 + i * 0.05 });
  cat.position.set(w.x, 0, w.z);
  cat.rotation.y = faceDir(pc, PATH[idx - 1] || PATH[idx + 1]);
  engine.add(cat);
  addCheeseAt(PATH[idx + 1] || pc, 0.7, false);
  catData.push({ cell: pc, group: cat, solved: false, isBoss: false, count: 5, passMin: 2, num: i + 1 });
  catBlocked.add(pc);
});
const bossC = PATH[bossIdx];
const boss = makeCat({ fur: "#8a8f98", scale: 1.8 });
const bw = cellToWorld(bossC.r, bossC.c);
boss.position.set(bw.x, 0, bw.z);
boss.rotation.y = faceDir(bossC, PATH[bossIdx - 1] || bossC);
engine.add(boss);
addCheeseAt(PATH[L - 1], 1.6, true);   // največji sir za bossom
catData.push({ cell: bossC, group: boss, solved: false, isBoss: true, count: 10, passMin: 4, num: 0 });
catBlocked.add(bossC);

/* ===========================================================
   IGRA: izbira miške, težavnost, življenja, srečanja, zmaga
   =========================================================== */
const LANG = (typeof localStorage !== "undefined" && localStorage.getItem("azv-lang") === "en") ? "en" : "sl";
const overlay = document.getElementById("ui-overlay");

const MICE = [
  { op: "add", sym: "+", name: { sl: "Plusko", en: "Plusko" }, tunic: "#3a7bd5", desc: { sl: "seštevanje", en: "addition" } },
  { op: "sub", sym: "−", name: { sl: "Minka", en: "Minka" }, tunic: "#e2663b", desc: { sl: "odštevanje", en: "subtraction" } },
  { op: "mul", sym: "×", name: { sl: "Krat", en: "Krat" }, tunic: "#7a4ed0", desc: { sl: "množenje", en: "multiplication" } },
  { op: "div", sym: "÷", name: { sl: "Delko", en: "Delko" }, tunic: "#2ca06a", desc: { sl: "deljenje", en: "division" } },
];
const DIFFS = [
  { id: "easy", name: { sl: "LAHKO", en: "EASY" }, lives: 5, range: { add: 10, sub: 10, mul: 5, div: 5 } },
  { id: "med", name: { sl: "SREDNJE", en: "MEDIUM" }, lives: 4, range: { add: 20, sub: 20, mul: 10, div: 10 } },
  { id: "hard", name: { sl: "TEŽKO", en: "HARD" }, lives: 3, range: { add: 50, sub: 50, mul: 12, div: 12 } },
];
const T = {
  sl: {
    pickMouse: "Izberi bojevniško miš", pickMouseSub: "Vsaka se bori z drugo računsko operacijo",
    pickDiff: "Izberi težavnost", lives: "življenja",
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
  },
  en: {
    pickMouse: "Choose a warrior mouse", pickMouseSub: "Each fights with a different math operation",
    pickDiff: "Choose difficulty", lives: "lives",
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
  .bm-mice{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
  .bm-mouse{display:flex;align-items:center;gap:12px;padding:12px;border-radius:14px;border:3px solid #2b2b2b;background:#fff;cursor:pointer;text-align:left;font-family:inherit;}
  .bm-mouse:active{transform:scale(.97);}
  .bm-sym{width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:30px;font-weight:800;flex:0 0 auto;}
  .bm-mname{font-weight:800;font-size:20px;} .bm-mdesc{color:#666;font-size:13px;}
  .bm-diffs{display:flex;flex-direction:column;gap:10px;}
  .bm-diff{font-family:inherit;font-weight:800;font-size:22px;padding:14px;border-radius:14px;border:3px solid #2b2b2b;background:#eaf1ff;cursor:pointer;display:flex;justify-content:space-between;}
  .bm-diff:active{transform:scale(.98);}
  .bm-btn{font-family:inherit;font-weight:800;font-size:20px;padding:12px 26px;border-radius:14px;border:3px solid #2b2b2b;background:#ffd23b;cursor:pointer;margin-top:14px;}
  .bm-btn:active{transform:scale(.97);}
  .bm-msg{font-size:20px;margin:6px 0 4px;line-height:1.4;}
  .bm-hud{position:absolute;top:10px;left:12px;z-index:8;font-family:"Baloo 2",sans-serif;font-size:22px;
    background:rgba(0,0,0,.35);color:#fff;padding:4px 12px;border-radius:20px;letter-spacing:2px;display:none;}
  `;
  document.head.appendChild(s);
})();

const hud = document.createElement("div");
hud.className = "bm-hud";
document.getElementById("stage").appendChild(hud);
function updateHud() { hud.style.display = gameOn ? "block" : "none"; hud.textContent = "❤".repeat(Math.max(0, lives)) + "🖤".repeat(Math.max(0, (diff.lives - lives))); }

function showScreen(html) { overlay.innerHTML = '<div class="bm-card">' + html + "</div>"; overlay.classList.add("show"); return overlay.querySelector(".bm-card"); }
function hideScreen() { overlay.classList.remove("show"); overlay.innerHTML = ""; }

/* ---- izbira miške ---- */
function showMouseSelect() {
  engine.paused = true; gameOn = false; updateHud();
  const card = showScreen('<div class="bm-h">' + T.pickMouse + '</div><div class="bm-sub">' + T.pickMouseSub + '</div><div class="bm-mice"></div>');
  const grid = card.querySelector(".bm-mice");
  MICE.forEach((m) => {
    const b = document.createElement("button"); b.className = "bm-mouse";
    b.innerHTML = '<span class="bm-sym" style="background:' + m.tunic + '">' + m.sym + '</span><span><div class="bm-mname">' + m.name[LANG] + '</div><div class="bm-mdesc">' + m.desc[LANG] + '</div></span>';
    b.onclick = () => { chosenMouse = m; recolorPlayer(m.tunic); showDiffSelect(); };
    grid.appendChild(b);
  });
}
function recolorPlayer(tunic) {
  // jopič (telo) miši v barvo izbrane operacije
  if (player.children[0] && player.children[0].material) player.children[0].material.color.set(tunic);
}
/* ---- izbira težavnosti ---- */
function showDiffSelect() {
  const card = showScreen('<div class="bm-h">' + T.pickDiff + '</div><div class="bm-diffs"></div>');
  const list = card.querySelector(".bm-diffs");
  DIFFS.forEach((d) => {
    const b = document.createElement("button"); b.className = "bm-diff";
    b.innerHTML = "<span>" + d.name[LANG] + '</span><span style="color:#e23b3b">' + "❤".repeat(d.lives) + "</span>";
    b.onclick = () => { diff = d; lives = d.lives; startGame(); };
    list.appendChild(b);
  });
}
/* ---- začetek igre ---- */
function startGame() {
  hideScreen(); gameOn = true; inEncounter = false; engine.paused = false; updateHud();
}
/* ---- sporočilo (rezultat srečanja) ---- */
function showMessage(msg, btnLabel) {
  return new Promise((resolve) => {
    const card = showScreen('<div class="bm-msg">' + msg + '</div>');
    const b = document.createElement("button"); b.className = "bm-btn"; b.textContent = btnLabel;
    b.onclick = () => { hideScreen(); resolve(); };
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
  const title = cat.isBoss ? T.bossTitle : T.catTitle(cat.num);
  const sub = T.opSub(chosenMouse.sym);
  while (true) {
    const { correct } = await runQuiz({ mount: overlay, op: chosenMouse.op, count: cat.count, range: rangeFor(chosenMouse.op), title, sub, lang: LANG });
    if (correct === cat.count) {                    // vse pravilno → mimo
      cat.solved = true;
      catBlocked.delete(cat.cell);
      await showMessage(T.pass, T.next);
      break;
    }
    if (correct >= cat.passMin) {                   // opraskan → izgubi življenje, znova
      loseLife();
      if (lives <= 0) { await gameOver(); return; }
      await showMessage(T.scratch, T.retry);
      continue;
    }
    // pojeden → izgubi življenje, nazaj na začetek
    loseLife();
    if (lives <= 0) { await gameOver(); return; }
    await showMessage(T.eat, T.next);
    resetToStart();
    break;
  }
  inEncounter = false; engine.paused = false;
}

async function gameOver() {
  const card = showScreen('<div class="bm-h">' + T.over + '</div><div class="bm-sub">' + T.overSub + "</div>");
  const b = document.createElement("button"); b.className = "bm-btn"; b.textContent = T.again;
  b.onclick = () => location.reload();
  card.appendChild(b);
}
async function win() {
  gameOn = false; updateHud();
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
  // sprožitev srečanja ob speči mački (inEncounter prepreči ponovno sprožitev)
  for (const cat of catData) {
    if (cat.solved) continue;
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
      if (c.big) win();
    }
  }
};

engine.start();
showMouseSelect();

/* ---------- mobilno: skrij akcijska gumba (premik je joystick) ---------- */
(function () {
  const hide = (sel) => { const el = document.querySelector(sel); if (el) el.style.display = "none"; };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => hide(".game-controls"));
  else hide(".game-controls");
})();
