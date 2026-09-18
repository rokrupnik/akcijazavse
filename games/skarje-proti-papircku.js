/* ===========================================================
   ŠKARJE PROTI PAPIRČKU  (avtor zgodbe: Jakob)
   3D akcijska igra v puščavnem labirintu (stene so kaktusi, ki
   niso nevarni). Ti si PAPIRČEK: od daleč streljaš z LOKOM (ali s
   SAMOSTRELOM, ko ga pobereš), od blizu sekaš z MEČEM. Škarje te
   strižejo in od daleč skočijo nate — a ne morejo čez kaktuse.
   Po 5 premaganih škarjah dobiš puščice (ostanejo na tleh, poberi
   jih), po 10 pa samostrel. Ko premagaš vse škarje in še VELIKE
   ŠKARJE, prideš v puščico (peresnico) — tam te čaka zaklad, ki
   papirčka trajno izboljša za naslednjo igro (shrani se v brskalnik).

   3D pogon je v ./lib/iso-engine.js; tu je vsa vsebina (labirint,
   modeli, škarje, boj, zasloni).
   =========================================================== */
import { IsoEngine, box, THREE } from "./lib/iso-engine.js";

const canvas = document.getElementById("game");

/* ===========================================================
   LABIRINT (vsako igro drugačen; DFS + nekaj dodatnih odprtin = zanke)
   =========================================================== */
const COLS = 9, ROWS = 9, CELL = 5, WALL = 0.7;
function cellToWorld(r, c) { return { x: (c - (COLS - 1) / 2) * CELL, z: (r - (ROWS - 1) / 2) * CELL }; }
function worldToCell(x, z) { return { c: Math.round(x / CELL + (COLS - 1) / 2), r: Math.round(z / CELL + (ROWS - 1) / 2) }; }

let cells = [], startCell = null, endCell = null;
function cellAt(r, c) { return (r >= 0 && r < ROWS && c >= 0 && c < COLS) ? cells[r][c] : null; }
function linked(cell, dr, dc) { const n = cellAt(cell.r + dr, cell.c + dc); return !!n && cell.links.has(n); }
function cellOf(x, z) { const p = worldToCell(x, z); return cellAt(p.r, p.c); }

function generateMaze() {
  cells = [];
  for (let r = 0; r < ROWS; r++) { cells.push([]); for (let c = 0; c < COLS; c++) cells[r].push({ r, c, links: new Set(), vis: false }); }
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  startCell = cells[ROWS - 1][Math.floor(COLS / 2)];
  startCell.vis = true;
  const stack = [startCell];
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const nbrs = [];
    for (const [dr, dc] of dirs) { const n = cellAt(cur.r + dr, cur.c + dc); if (n && !n.vis) nbrs.push(n); }
    if (nbrs.length) { const n = nbrs[Math.floor(Math.random() * nbrs.length)]; cur.links.add(n); n.links.add(cur); n.vis = true; stack.push(n); }
    else stack.pop();
  }
  // dodatne odprtine (zanke): škarje lahko pridejo od več strani, ti pa jih lahko obideš
  let extra = Math.round(ROWS * COLS * 0.16), tries = 0;
  while (extra > 0 && tries++ < 500) {
    const cell = cells[Math.floor(Math.random() * ROWS)][Math.floor(Math.random() * COLS)];
    const [dr, dc] = dirs[Math.floor(Math.random() * 4)];
    const n = cellAt(cell.r + dr, cell.c + dc);
    if (n && !cell.links.has(n)) { cell.links.add(n); n.links.add(cell); extra--; }
  }
  // puščica (cilj) = najbolj oddaljena celica od starta
  const d = bfsFrom(startCell);
  let maxD = 0; d.forEach((v) => { if (v > maxD) maxD = v; });
  endCell = startCell; let bestGeo = -1;
  d.forEach((v, cell) => {
    if (v < maxD * 0.7) return;
    const geo = Math.abs(cell.r - startCell.r) + Math.abs(cell.c - startCell.c);
    if (geo > bestGeo) { bestGeo = geo; endCell = cell; }
  });
}
function bfsFrom(cell) {
  const d = new Map(); d.set(cell, 0); const q = [cell];
  while (q.length) { const cur = q.shift(); for (const n of cur.links) if (!d.has(n)) { d.set(n, d.get(cur) + 1); q.push(n); } }
  return d;
}

/* kolizija: robovi celice brez odprtine + vogalni stebri (skale) */
function solid(x, z) {
  const cell = cellOf(x, z); if (!cell) return true;
  const w = cellToWorld(cell.r, cell.c);
  const lx = x - w.x, lz = z - w.z, e = CELL / 2 - WALL / 2;
  if (Math.abs(lx) > e && Math.abs(lz) > e) return true;   // vogal (skala) — vedno trden
  if (lx > e && !linked(cell, 0, 1)) return true;
  if (lx < -e && !linked(cell, 0, -1)) return true;
  if (lz > e && !linked(cell, 1, 0)) return true;
  if (lz < -e && !linked(cell, -1, 0)) return true;
  return false;
}
/* ali je ravna črta med točkama prosta (brez kaktusov)? — za skok škarij in puščice */
function losClear(ax, az, bx, bz) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(d / 0.3));
  for (let i = 1; i <= n; i++) { const t = i / n; if (solid(ax + (bx - ax) * t, az + (bz - az) * t)) return false; }
  return true;
}

/* ---------- pogon ---------- */
const SKY = "#f4dcae";
const engine = new IsoEngine(canvas, {
  viewSize: 8.5,
  bg: SKY,
  camOffset: new THREE.Vector3(0, 18, 13.5),
  solid,
  speed: 6.8,
  radius: 0.42,
});
engine.scene.fog = new THREE.Fog(SKY, 26, 52);

/* ---------- pomočniki ---------- */
function ball(r, color, opts = {}) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), new THREE.MeshLambertMaterial({ color }));
  m.castShadow = opts.cast !== false; m.receiveShadow = opts.receive !== false; return m;
}
function glow(geo, color) { return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color })); }
function rnd(a, b) { return a + Math.random() * (b - a); }
function lerp(a, b, t) { return a + (b - a) * t; }
const TAU = Math.PI * 2;

/* ===========================================================
   SVET: pesek, kaktusi ob stenah (instanced), skale v vogalih, puščica
   =========================================================== */
const world = new THREE.Group(); engine.add(world);
let pencilCase = null;

function instanced(geo, color, items, cast = true) {
  if (!items.length) return null;
  const mat = new THREE.MeshLambertMaterial({ color });
  const im = new THREE.InstancedMesh(geo, mat, items.length);
  const d = new THREE.Object3D();
  items.forEach((it, i) => {
    d.position.set(it.x, it.y, it.z); d.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0);
    d.scale.set(it.sx, it.sy, it.sz); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
  });
  im.instanceMatrix.needsUpdate = true; im.castShadow = cast; im.receiveShadow = true;
  world.add(im); return im;
}

function buildWorld() {
  while (world.children.length) world.remove(world.children[0]);
  // pesek (velika podlaga)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(COLS * CELL + 60, ROWS * CELL + 60), new THREE.MeshLambertMaterial({ color: "#dcbd7e" }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true; world.add(ground);
  // ploščice celic (rahlo različen pesek — lažje se vidi razdalja)
  const tileGeo = new THREE.PlaneGeometry(CELL, CELL);
  const tA = new THREE.MeshLambertMaterial({ color: "#e8cb8c" }), tB = new THREE.MeshLambertMaterial({ color: "#e2c384" });
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const w = cellToWorld(r, c);
    const t = new THREE.Mesh(tileGeo, (r + c) % 2 ? tA : tB); t.rotation.x = -Math.PI / 2; t.position.set(w.x, 0.01, w.z); t.receiveShadow = true; world.add(t);
  }
  // stene: zberi segmente (vsak le enkrat)
  const segs = [];   // {x,z,horiz}
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const cell = cells[r][c], w = cellToWorld(r, c), h = CELL / 2;
    if (!linked(cell, 0, 1)) segs.push({ x: w.x + h, z: w.z, horiz: false });
    if (!linked(cell, 1, 0)) segs.push({ x: w.x, z: w.z + h, horiz: true });
    if (c === 0) segs.push({ x: w.x - h, z: w.z, horiz: false });
    if (r === 0) segs.push({ x: w.x, z: w.z - h, horiz: true });
  }
  const ridges = [], bodies = [], armsH = [], armsV = [], flowers = [];
  segs.forEach((s) => {
    ridges.push({ x: s.x, y: 0.22, z: s.z, sx: s.horiz ? CELL + WALL : WALL, sy: 0.44, sz: s.horiz ? WALL : CELL + WALL });
    const n = Math.random() < 0.5 ? 2 : 3;
    const offs = n === 2 ? [-1.25, 1.25] : [-1.7, 0, 1.7];
    offs.forEach((o) => {
      const along = o + rnd(-0.2, 0.2), across = rnd(-0.08, 0.08);
      const x = s.horiz ? s.x + along : s.x + across, z = s.horiz ? s.z + across : s.z + along;
      const h = rnd(1.3, 2.4), rad = rnd(0.24, 0.34);
      bodies.push({ x, y: h / 2 + 0.3, z, sx: rad, sy: h, sz: rad });
      if (Math.random() < 0.55) {
        const side = Math.random() < 0.5 ? -1 : 1, ay = 0.3 + h * rnd(0.45, 0.65), len = rnd(0.35, 0.55);
        const ax = s.horiz ? x + side * (rad + len / 2 - 0.05) : x, az = s.horiz ? z : z + side * (rad + len / 2 - 0.05);
        armsH.push({ x: ax, y: ay, z: az, sx: 0.16, sy: len, sz: 0.16, rz: s.horiz ? Math.PI / 2 : 0, rx: s.horiz ? 0 : Math.PI / 2 });
        const ux = s.horiz ? x + side * (rad + len - 0.05) : x, uz = s.horiz ? z : z + side * (rad + len - 0.05);
        const ul = rnd(0.4, 0.7);
        armsV.push({ x: ux, y: ay + ul / 2 - 0.05, z: uz, sx: 0.16, sy: ul, sz: 0.16 });
      }
      if (Math.random() < 0.18) flowers.push({ x, y: h + 0.38, z, sx: 0.14, sy: 0.14, sz: 0.14 });
    });
  });
  // vogalne skale (na vsakem vogalu, ob katerem je vsaj ena stena — za enostavnost: na vseh vogalih)
  const rocks = [];
  for (let r = 0; r <= ROWS; r++) for (let c = 0; c <= COLS; c++) {
    const x = (c - COLS / 2) * CELL, z = (r - ROWS / 2) * CELL;
    rocks.push({ x, y: 0.22, z, sx: rnd(0.5, 0.62), sy: rnd(0.42, 0.55), sz: rnd(0.5, 0.62), ry: rnd(0, TAU) });
  }
  // šopi trave po tleh (okras, brez kolizije)
  const tufts = [];
  for (let i = 0; i < 90; i++) {
    const r = Math.floor(Math.random() * ROWS), c = Math.floor(Math.random() * COLS), w = cellToWorld(r, c);
    tufts.push({ x: w.x + rnd(-1.6, 1.6), y: 0.03, z: w.z + rnd(-1.6, 1.6), sx: rnd(0.25, 0.5), sy: 1, sz: rnd(0.25, 0.5), rx: -Math.PI / 2, ry: 0, rz: 0 });
  }
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 9);
  instanced(new THREE.BoxGeometry(1, 1, 1), "#c9a46a", ridges);
  instanced(cyl, "#4f9a3e", bodies);
  instanced(cyl, "#4f9a3e", armsH);
  instanced(cyl, "#5aa847", armsV);
  instanced(new THREE.SphereGeometry(1, 8, 6), "#ff6fa0", flowers, false);
  instanced(new THREE.SphereGeometry(1, 9, 7), "#b48f66", rocks);
  instanced(new THREE.CircleGeometry(1, 7), "#c8ad6a", tufts, false);
  // sonce (okras na nebu — pritrjeno na kamero ni potrebno: veliko sonce daleč zadaj)
  // puščica (peresnica) na ciljni celici
  const ew = cellToWorld(endCell.r, endCell.c);
  pencilCase = makePencilCase(); pencilCase.position.set(ew.x, 0, ew.z);
  pencilCase.rotation.y = Math.atan2(startCell.c - endCell.c, startCell.r - endCell.r);
  world.add(pencilCase);
}

/* ===========================================================
   MODELI (low-poly: kocke, krogle, valji)
   =========================================================== */
/* papirček — list papirja s črtami, obrazom, tankimi rokami in nogami; lok v levi, meč v desni */
function makePaper(opts = {}) {
  const white = "#fbfbf4", g = new THREE.Group();
  const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.02, 0.09), new THREE.MeshLambertMaterial({ color: white, emissive: "#9c9c96" }));
  sheet.castShadow = true; sheet.receiveShadow = false; sheet.position.y = 0.86; g.add(sheet);
  // modre črte + rdeča robna črta (kot zvezek)
  for (let i = 0; i < 4; i++) { const ln = box(0.62, 0.02, 0.012, "#9fc3ea", { cast: false }); ln.position.set(0.04, 0.5 + i * 0.13, 0.05); g.add(ln); }
  const margin = box(0.02, 0.9, 0.012, "#f0a0a0", { cast: false }); margin.position.set(-0.28, 0.86, 0.05); g.add(margin);
  // zavihan vogal (mali trikotnik zgoraj desno)
  const fold = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.05, 3), new THREE.MeshLambertMaterial({ color: "#e6e2d2" }));
  fold.rotation.x = Math.PI / 2; fold.position.set(0.3, 1.27, 0.05); g.add(fold);
  // obraz
  for (const sx of [-1, 1]) {
    const e = ball(0.075, "#ffffff", { cast: false }); e.position.set(sx * 0.17, 1.08, 0.06); g.add(e);
    const p = ball(0.04, "#1a1a1a", { cast: false }); p.position.set(sx * 0.17, 1.08, 0.125); g.add(p);
    const cheek = ball(0.05, "#f7b3c2", { cast: false }); cheek.scale.set(1, 0.7, 0.4); cheek.position.set(sx * 0.27, 0.96, 0.06); g.add(cheek);
  }
  const mouth = box(0.2, 0.035, 0.012, "#333", { cast: false }); mouth.position.set(0, 0.93, 0.06); g.add(mouth);
  // roke (tanke črte) + noge
  for (const sx of [-1, 1]) {
    const arm = box(0.09, 0.42, 0.09, "#efece0"); arm.position.set(sx * 0.48, 0.8, 0.02); arm.rotation.z = -sx * 0.25; g.add(arm);
    const leg = box(0.14, 0.34, 0.14, "#e4dfcc"); leg.position.set(sx * 0.2, 0.17, 0); g.add(leg);
  }
  // LOK v levi roki (navpičen lok, izbočen naprej)
  const bow = new THREE.Group();
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 6, 12, Math.PI), new THREE.MeshLambertMaterial({ color: "#8a5a22" }));
  const holder = new THREE.Group(); holder.add(arc); holder.rotation.z = Math.PI / 2;   // konca ob ±Y, izbočen bočno (oblika D)
  bow.add(holder);
  const string = box(0.02, 0.84, 0.02, "#f2f2f2", { cast: false }); bow.add(string);
  bow.position.set(-0.56, 0.86, 0.22); g.add(bow); g.userData.bow = bow;
  // SAMOSTREL (skrit, dokler ga ne pobereš)
  const cb = makeCrossbow(); cb.position.set(-0.56, 0.8, 0.3); cb.visible = false; g.add(cb); g.userData.crossbow = cb;
  // MEČ v desni roki
  const sword = new THREE.Group();
  const blade = box(0.07, 0.7, 0.07, "#e6ecf4"); blade.position.y = 0.36; sword.add(blade);
  const guard = box(0.26, 0.07, 0.1, "#c9952f"); guard.position.y = 0.02; sword.add(guard);
  const hilt = box(0.08, 0.18, 0.08, "#8a5a22"); hilt.position.y = -0.1; sword.add(hilt);
  sword.position.set(0.56, 0.72, 0.16); g.add(sword); g.userData.sword = sword;
  if (opts.scale) g.scale.setScalar(opts.scale);
  return g;
}

function makeCrossbow() {
  const g = new THREE.Group();
  const stock = box(0.1, 0.1, 0.7, "#6b4a2a"); g.add(stock);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 6, 12, Math.PI), new THREE.MeshLambertMaterial({ color: "#3d3d46" }));
  arc.rotation.x = Math.PI / 2; arc.position.z = 0.2; g.add(arc);            // vodoraven lok spredaj
  const string = box(0.68, 0.02, 0.02, "#f2f2f2", { cast: false }); string.position.z = 0.2; g.add(string);
  const tip = glow(new THREE.SphereGeometry(0.05, 6, 6), "#ff7b3c"); tip.position.z = 0.36; g.add(tip);
  return g;
}

/* škarje — dve rezili spredaj (odpirajo/zapirajo se), dva obročka zadaj, oči na vijaku */
function makeScissors(opts = {}) {
  const g = new THREE.Group();
  const metal = opts.metal || "#cfd6de", ringA = opts.ringA || "#e2453b", ringB = opts.ringB || "#2f6fe0";
  const Y = 0.5;
  for (const sx of [-1, 1]) {
    const bg = new THREE.Group(); bg.position.set(0, Y, 0);
    const bl = box(0.09, 0.14, 1.05, metal); bl.position.set(sx * 0.04, 0, 0.52); bg.add(bl);
    const edge = box(0.04, 0.08, 0.95, "#f4f7fa", { cast: false }); edge.position.set(sx * 0.09, 0, 0.5); bg.add(edge);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 4), new THREE.MeshLambertMaterial({ color: metal }));
    tip.rotation.x = Math.PI / 2; tip.position.set(sx * 0.04, 0, 1.15); bg.add(tip);
    g.add(bg); g.userData[sx < 0 ? "bladeL" : "bladeR"] = bg;
    // obroček (ročaj) zadaj
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 8, 16), new THREE.MeshLambertMaterial({ color: sx < 0 ? ringA : ringB }));
    ring.rotation.x = Math.PI / 2; ring.position.set(sx * 0.22, Y, -0.4); ring.castShadow = true; g.add(ring);
    const neck = box(0.08, 0.1, 0.3, sx < 0 ? ringA : ringB); neck.position.set(sx * 0.12, Y, -0.12); neck.rotation.y = -sx * 0.3; g.add(neck);
  }
  const screw = ball(0.11, "#4a4f57"); screw.position.set(0, Y + 0.05, 0.02); g.add(screw);
  // jezne oči
  for (const sx of [-1, 1]) {
    const e = ball(0.085, "#ffffff", { cast: false }); e.position.set(sx * 0.11, Y + 0.2, 0.06); g.add(e);
    const p = ball(0.045, "#1a1a1a", { cast: false }); p.position.set(sx * 0.11, Y + 0.2, 0.135); g.add(p);
    const brow = box(0.16, 0.035, 0.03, "#2b2b2b", { cast: false }); brow.position.set(sx * 0.11, Y + 0.31, 0.1); brow.rotation.z = -sx * 0.5; g.add(brow);
  }
  g.scale.setScalar(opts.scale || 1);
  return g;
}
function setBlades(g, open) {
  if (g.userData.bladeL) g.userData.bladeL.rotation.y = open;
  if (g.userData.bladeR) g.userData.bladeR.rotation.y = -open;
}

/* puščica / strelica samostrela */
function makeArrow(bolt) {
  const g = new THREE.Group();
  const shaft = box(0.06, 0.06, bolt ? 0.55 : 0.8, bolt ? "#4a3a2a" : "#a8763e", { cast: false }); g.add(shaft);
  const tip = bolt ? glow(new THREE.ConeGeometry(0.07, 0.2, 6), "#ff7b3c")
    : new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 6), new THREE.MeshLambertMaterial({ color: "#cfd6de" }));
  tip.rotation.x = Math.PI / 2; tip.position.z = (bolt ? 0.27 : 0.4) + 0.1; g.add(tip);
  const f1 = box(0.02, 0.16, 0.14, "#e2453b", { cast: false }); f1.position.z = bolt ? -0.22 : -0.34; g.add(f1);
  const f2 = box(0.16, 0.02, 0.14, "#e2453b", { cast: false }); f2.position.z = bolt ? -0.22 : -0.34; g.add(f2);
  return g;
}
/* pobiranje: puščica zapičena v tla / tul s puščicami / samostrel / srček */
function haloWrap(inner, color, r = 0.5) {
  const wrap = new THREE.Group(); wrap.add(inner);
  const halo = glow(new THREE.TorusGeometry(r, 0.04, 8, 22), color); halo.rotation.x = Math.PI / 2; halo.position.y = 0.06;
  wrap.add(halo); wrap.userData.halo = halo; return wrap;
}
function makeStuckArrow() { const a = makeArrow(false); a.rotation.x = 1.1; a.position.y = 0.32; return haloWrap(a, "#ffe08a", 0.35); }
function makeQuiver() {
  const g = new THREE.Group();
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.6, 10), new THREE.MeshLambertMaterial({ color: "#7a4a1e" })); tube.castShadow = true; tube.position.y = 0.3; g.add(tube);
  for (let i = 0; i < 4; i++) { const a = makeArrow(false); a.rotation.x = Math.PI / 2 + rnd(-0.15, 0.15); a.rotation.z = rnd(-0.2, 0.2); a.position.set(rnd(-0.08, 0.08), 0.7, rnd(-0.08, 0.08)); g.add(a); }
  g.position.y = 0.1; return haloWrap(g, "#ffd23b", 0.55);
}
function makeCrossbowPickup() { const c = makeCrossbow(); c.position.y = 0.55; c.rotation.x = 0.3; return haloWrap(c, "#ff7b3c", 0.55); }
function makeHeart() {
  const col = "#ff4d6d", g = new THREE.Group();
  const l = ball(0.2, col); l.position.set(-0.15, 0.12, 0); g.add(l);
  const r = ball(0.2, col); r.position.set(0.15, 0.12, 0); g.add(r);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.46, 14), new THREE.MeshLambertMaterial({ color: col })); tip.rotation.x = Math.PI; tip.position.y = -0.16; tip.castShadow = true; g.add(tip);
  g.position.y = 0.75; return haloWrap(g, "#ff9ab0", 0.5);
}

/* puščica (peresnica) — barvita škatla z zadrgo; ko se odpre, se pokaže zaklad */
function makePencilCase() {
  const g = new THREE.Group();
  const body = box(2.4, 0.8, 1.15, "#7a4ed0"); body.position.y = 0.4; g.add(body);
  const stripe = box(2.42, 0.18, 1.17, "#ffd23b", { cast: false }); stripe.position.y = 0.3; g.add(stripe);
  const lid = new THREE.Group(); lid.position.set(0, 0.8, -0.575);
  const lidTop = box(2.4, 0.16, 1.15, "#8f63e6"); lidTop.position.set(0, 0.08, 0.575); lid.add(lidTop);
  const zip = box(2.2, 0.05, 0.14, "#e8e8f0", { cast: false }); zip.position.set(0, 0.18, 0.575); lid.add(zip);
  const tab = box(0.16, 0.08, 0.22, "#333", { cast: false }); tab.position.set(1.0, 0.2, 0.575); lid.add(tab);
  g.add(lid); g.userData.lid = lid;
  // zaklad (skrit, dokler ni odprta)
  const treasure = new THREE.Group();
  const star = glow(new THREE.OctahedronGeometry(0.42, 0), "#ffd23b"); star.position.y = 1.5; treasure.add(star);
  const ring = glow(new THREE.TorusGeometry(0.7, 0.05, 8, 26), "#fff1a8"); ring.rotation.x = Math.PI / 2; ring.position.y = 1.5; treasure.add(ring);
  treasure.visible = false; g.add(treasure); g.userData.treasure = treasure;
  // ključavnica (dokler so škarje žive) — rdeča lučka
  const lock = glow(new THREE.SphereGeometry(0.1, 8, 8), "#ff3b3b"); lock.position.set(-1.0, 0.98, 0.5); g.add(lock); g.userData.lock = lock;
  return g;
}

/* ===========================================================
   ZVOK + GLASBA (WebAudio, brez datotek)
   =========================================================== */
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
function noise(dur, vol, slide) {
  const a = ac(); if (!a) return;
  const t = a.currentTime, buf = a.createBuffer(1, Math.max(1, a.sampleRate * dur), a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = a.createBufferSource(); s.buffer = buf; const g = a.createGain();
  const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(slide ? 3000 : 1200, t);
  if (slide) f.frequency.exponentialRampToValueAtTime(300, t + dur);
  g.gain.setValueAtTime(vol || 0.1, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(a.destination); s.start(t);
}
function seq(notes, gap, type, vol) { notes.forEach((f, i) => setTimeout(() => beep(f, gap * 1.5, type, vol), i * gap * 1000)); }
const SFX = {
  click() { beep(520, 0.05, "square", 0.1, 720); },
  bow() { beep(220, 0.12, "triangle", 0.12, 660); noise(0.06, 0.04, true); },          // tlesk tetive
  crossbow() { beep(160, 0.1, "sawtooth", 0.12, 900); noise(0.08, 0.06, true); },
  empty() { beep(300, 0.06, "square", 0.05, 200); },
  sword() { beep(300, 0.18, "sine", 0.12, 760); noise(0.1, 0.05, true); },              // švist
  snip() { noise(0.05, 0.12, true); beep(1400, 0.06, "square", 0.08, 700); beep(900, 0.05, "square", 0.06, 500); },   // cak-cak
  hit() { beep(900, 0.08, "square", 0.08, 300); },                                     // klenk (zadetek kovine)
  leap() { beep(180, 0.25, "sine", 0.1, 520); },                                       // hop
  land() { noise(0.12, 0.1, true); },
  break_() { noise(0.25, 0.16, true); beep(700, 0.2, "square", 0.1, 120); beep(1100, 0.15, "square", 0.06, 200); },
  hurt() { beep(200, 0.22, "sawtooth", 0.18, 80); },
  pickup() { seq([660, 880, 1320], 0.06, "triangle", 0.16); },
  heal() { seq([880, 1175, 1568, 1976], 0.07, "triangle", 0.18); },
  big() { seq([392, 523, 659, 784], 0.08, "triangle", 0.18); },                         // samostrel / tul
  boss() { seq([220, 196, 175, 165], 0.18, "sawtooth", 0.16); },
  open() { seq([523, 659, 784, 1047, 1319], 0.1, "triangle", 0.18); },
  win() { seq([523, 659, 784, 1047, 1319, 1568, 2093], 0.13, "triangle", 0.2); },
  over() { seq([400, 320, 250, 170], 0.17, "sawtooth", 0.18); },
};

const Music = (function () {
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  // puščavska (frigijska barva, počasna)
  const EX_MEL = [64, -1, 65, -1, 67, -1, 64, -1, 62, -1, 60, -1, 62, -1, 64, -1];
  const EX_BASS = [40, -1, -1, -1, 40, -1, -1, -1, 41, -1, -1, -1, 43, -1, -1, -1];
  // boj (hitrejša, molova)
  const BT_MEL = [64, 64, 67, 64, 65, 65, 64, 62, 60, 60, 62, 64, 65, 64, 62, 60];
  const BT_BASS = [40, 40, -1, 40, 43, 43, -1, 43, 41, 41, -1, 41, 38, 38, -1, 38];
  let timer = null, nextT = 0, step = 0, mood = "explore", master = null, started = false, muted = false, vol = 0.4;
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
      if (EX_MEL[s] > 0) tone(mtof(EX_MEL[s]), t, 0.5, "triangle", 0.08);
      if (EX_BASS[s] > 0) tone(mtof(EX_BASS[s]), t, 0.7, "sine", 0.1);
    } else {
      if (BT_MEL[s] > 0) tone(mtof(BT_MEL[s]), t, 0.15, "square", 0.05);
      if (BT_BASS[s] > 0) tone(mtof(BT_BASS[s]), t, 0.18, "sawtooth", 0.08);
    }
  }
  function scheduler() {
    const a = ac(); if (!a) return;
    while (nextT < a.currentTime + 0.12) { playStep(step, nextT); nextT += (mood === "battle") ? 0.15 : 0.3; step = (step + 1) % 16; }
  }
  return {
    start() { const a = ac(); if (!a || started) return; started = true; master = a.createGain(); master.gain.value = 0; master.connect(a.destination); master.gain.linearRampToValueAtTime(muted ? 0 : vol, a.currentTime + 1.2); nextT = a.currentTime + 0.1; step = 0; timer = setInterval(scheduler, 25); },
    setMood(m) { mood = m; },
    toggleMute() { muted = !muted; const a = ac(); if (master && a) master.gain.linearRampToValueAtTime(muted ? 0 : vol, a.currentTime + 0.2); return !muted; },
  };
})();

/* ===========================================================
   PODATKI: težavnost, zakladi (trajne izboljšave), besedila
   =========================================================== */
const LANG = (typeof localStorage !== "undefined" && localStorage.getItem("azv-lang") === "en") ? "en" : "sl";

const DIFFS = [
  { id: "easy", name: { sl: "LAHKO", en: "EASY" }, lives: 6, total: 10, maxAlive: 2, hp: 2, spd: 0.85, leapEvery: [3.5, 5.5], bossHp: 16 },
  { id: "med", name: { sl: "SREDNJE", en: "MEDIUM" }, lives: 5, total: 15, maxAlive: 3, hp: 3, spd: 1.0, leapEvery: [2.6, 4.2], bossHp: 24 },
  { id: "hard", name: { sl: "TEŽKO", en: "HARD" }, lives: 4, total: 22, maxAlive: 4, hp: 4, spd: 1.15, leapEvery: [1.8, 3.2], bossHp: 34 },
];

/* zakladi iz puščice — shranjeni v brskalniku, veljajo za vse naslednje igre */
const TREASURE_KEY = "azv-spp-treasure";
const TREASURES = [
  { id: "hearts", icon: "❤️", max: 3, name: { sl: "Dodatno srce", en: "Extra heart" }, desc: { sl: "+1 življenje na začetku", en: "+1 life at the start" } },
  { id: "arrows", icon: "🏹", max: 3, name: { sl: "Poln tul", en: "Full quiver" }, desc: { sl: "+6 puščic na začetku", en: "+6 arrows at the start" } },
  { id: "sword", icon: "⚔️", max: 3, name: { sl: "Ostrejši meč", en: "Sharper sword" }, desc: { sl: "meč naredi več škode", en: "the sword does more damage" } },
  { id: "speed", icon: "👟", max: 3, name: { sl: "Hitre noge", en: "Fast feet" }, desc: { sl: "papirček teče hitreje", en: "the paper runs faster" } },
];
function loadTreasure() {
  const t = { hearts: 0, arrows: 0, sword: 0, speed: 0 };
  try { const s = JSON.parse(localStorage.getItem(TREASURE_KEY) || "{}"); for (const k in t) if (typeof s[k] === "number") t[k] = Math.max(0, Math.min(3, s[k] | 0)); } catch (e) {}
  return t;
}
function saveTreasure(t) { try { localStorage.setItem(TREASURE_KEY, JSON.stringify(t)); } catch (e) {} }
let treasure = loadTreasure();

const T = {
  sl: {
    title: "ŠKARJE PROTI PAPIRČKU", tagline: "Papirček z lokom in mečem v puščavnem labirintu!",
    start: "Začni", storyBy: "Zgodbo pripoveduje Jakob",
    story: [
      "Nekoč je živel papirček, ki je imel prijatelja — ene škarje. 📄✂️",
      "Potem sta se skregala: papirček ni smel priti v puščico (peresnico), moral bi iti v koš. Škarje so se pa norčevale iz njega. 😠",
      "Te ene škarje so dobile še več prijateljev škarjic … in začela se je VOJNA! ⚔️",
      "Ti si papirček. Od daleč streljaj z LOKOM, od blizu sekaj z MEČEM. Škarje skačejo nate — a ne morejo čez kaktuse! 🌵",
      "Po 5 premaganih škarjah dobiš puščice (poberi jih s tal), po 10 pa SAMOSTREL. Premagaj vse in pridi v puščico — tam te čaka zaklad!",
    ],
    pickDiff: "Izberi težavnost", scissors: "škarij", lives: "življenja",
    treasures: "Tvoji zakladi iz puščice:", noTreasure: "še nobenega — premagaj škarje in pridi v puščico!",
    hudScissors: "Škarje", hudArrows: "Puščice",
    got5: "+8 puščic! Poberi jih s tal. 🏹", got10: "SAMOSTREL! Poberi ga. 🎯", noArrows: "Ni več puščic! Poberi jih ali uporabi meč. ⚔️",
    bossBanner: "VELIKE ŠKARJE ✂️", bossSub: "Tiste, ki so začele vojno!",
    opened: "Puščica se je odprla! Pojdi noter. 🎁",
    win: "ZMAGA! 🎉", winSub: "Prišel si v puščico! Škarje so premagane.",
    pickTreasure: "Izberi zaklad (velja za vse naslednje igre):", saved: "Shranjeno! Naslednjič bo papirček še boljši. 💪",
    allMax: "Imaš že vse zaklade! Pravi junak. 🏆",
    teaser: "Naslednja soba: proti barvicam in šilčkom … kmalu! 🖍️",
    over: "KONEC 💔", overSub: "Škarje so papirček razrezale.",
    again: "Še enkrat", next: "Naprej",
  },
  en: {
    title: "SCISSORS VS. PAPER", tagline: "A paper sheet with a bow and a sword in a desert maze!",
    start: "Start", storyBy: "Story told by Jakob",
    story: [
      "Once upon a time there was a little paper sheet who had a friend — a pair of scissors. 📄✂️",
      "Then they had a fight: the paper wasn't allowed into the pencil case, it had to go to the bin. And the scissors made fun of him. 😠",
      "Those scissors got lots more scissor friends … and the WAR began! ⚔️",
      "You are the paper. Shoot the BOW from afar, slash with the SWORD up close. Scissors leap at you — but they can't cross the cacti! 🌵",
      "Beat 5 scissors to get arrows (pick them up off the ground), beat 10 to get the CROSSBOW. Beat them all and reach the pencil case — a treasure awaits!",
    ],
    pickDiff: "Choose difficulty", scissors: "scissors", lives: "lives",
    treasures: "Your pencil-case treasures:", noTreasure: "none yet — beat the scissors and reach the pencil case!",
    hudScissors: "Scissors", hudArrows: "Arrows",
    got5: "+8 arrows! Pick them up. 🏹", got10: "CROSSBOW! Pick it up. 🎯", noArrows: "Out of arrows! Pick some up or use the sword. ⚔️",
    bossBanner: "THE BIG SCISSORS ✂️", bossSub: "The ones who started the war!",
    opened: "The pencil case is open! Go inside. 🎁",
    win: "VICTORY! 🎉", winSub: "You made it into the pencil case! The scissors are beaten.",
    pickTreasure: "Pick a treasure (it counts for every game from now on):", saved: "Saved! The paper will be even better next time. 💪",
    allMax: "You already have every treasure! A true hero. 🏆",
    teaser: "Next room: versus crayons and sharpeners … coming soon! 🖍️",
    over: "GAME OVER 💔", overSub: "The scissors cut the paper to pieces.",
    again: "Play again", next: "Next",
  },
}[LANG];

/* ===========================================================
   STANJE
   =========================================================== */
const overlay = document.getElementById("ui-overlay");
let diff = DIFFS[1];
let lives = 5, maxLives = 5, gameOn = false;
let player = null;
let arrows = 12, bolts = 0, kills = 0, spawned = 0;
let fireCd = 0, swordCd = 0, invuln = 0, swordAnim = 0, bowAnim = 0;
let spawnTimer = 0, introTimer = 0;
let bossSpawned = false, bossDead = false, caseOpen = false;
let distMap = null, playerCell = null;

const enemies = [];   // {type, group, hp, r, spd, cur, next, leapCd, leaping, ...}
const pShots = [];    // {group, vx, vz, life, dmg, bolt}
const pickups = [];   // {group, kind, n, life}
const fx = [];        // obroči (učinki)

/* ===========================================================
   UI (CSS, HUD, banner, prilagajanje okvirju) — vzorec iz drugih 3D iger
   =========================================================== */
(function injectUi() {
  const s = document.createElement("style");
  s.textContent = `
  #ui-overlay{position:absolute;inset:0;display:none;align-items:center;justify-content:center;z-index:10;padding:8px;}
  #ui-overlay.show{display:flex;}
  .sp-card{background:#fdfdf7;border:5px solid #2b2b2b;border-radius:20px;padding:16px 20px;width:min(88%,560px);
    box-shadow:0 10px 30px rgba(0,0,0,.45);font-family:"Baloo 2",sans-serif;text-align:center;color:#1a1a1a;}
  .sp-h{font-weight:800;font-size:24px;margin:0 0 4px;}
  .sp-sub{color:#666;font-size:14px;margin:0 0 14px;}
  .sp-by{color:#0a6cc2;font-size:13px;margin:0 0 6px;font-weight:700;}
  .sp-diffs{display:flex;flex-direction:column;gap:10px;}
  .sp-diff{font-family:inherit;font-weight:800;font-size:22px;padding:12px 14px;border-radius:14px;border:3px solid #2b2b2b;background:#fff4dc;cursor:pointer;display:flex;justify-content:space-between;align-items:center;text-align:left;}
  .sp-diff:active{transform:scale(.98);}
  .sp-diffsub{font-size:13px;color:#666;font-weight:400;margin-top:2px;}
  .sp-btn{font-family:inherit;font-weight:800;font-size:20px;padding:12px 26px;border-radius:14px;border:3px solid #2b2b2b;background:#ffd23b;cursor:pointer;margin-top:14px;}
  .sp-btn:active{transform:scale(.97);}
  .sp-msg{font-size:20px;margin:6px 0 4px;line-height:1.4;}
  .sp-treas{background:#f3ecdc;border:2px dashed #b89b6a;border-radius:12px;padding:8px 10px;margin:8px 0 2px;font-size:15px;}
  .sp-treas b{font-size:18px;letter-spacing:2px;}
  .sp-rewards{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:8px;}
  .sp-reward{flex:1 1 130px;max-width:170px;font-family:inherit;border:3px solid #2b2b2b;border-radius:14px;background:#fff;padding:10px 8px;cursor:pointer;text-align:center;}
  .sp-reward:active{transform:scale(.97);}
  .sp-reward .ic{font-size:36px;line-height:1.1;} .sp-reward .nm{font-weight:800;font-size:16px;margin-top:4px;} .sp-reward .ds{font-size:12px;color:#666;}
  .sp-teaser{margin-top:10px;font-size:14px;color:#7a4ed0;font-weight:700;}
  .sp-hud{position:absolute;top:10px;left:12px;right:12px;z-index:8;font-family:"Baloo 2",sans-serif;
    display:none;justify-content:space-between;align-items:flex-start;gap:8px;pointer-events:none;padding-right:46px;}
  .sp-hud .pill{background:rgba(0,0,0,.42);color:#fff;padding:4px 12px;border-radius:18px;font-size:18px;letter-spacing:1px;}
  .sp-hud .right{text-align:right;font-size:15px;}
  .sp-banner{position:absolute;top:38%;left:0;right:0;z-index:9;text-align:center;pointer-events:none;
    font-family:"Baloo 2",sans-serif;color:#fff;text-shadow:0 3px 10px rgba(0,0,0,.7);opacity:0;transition:opacity .3s;}
  .sp-banner.show{opacity:1;}
  .sp-banner .big{font-size:36px;font-weight:800;letter-spacing:1px;}
  .sp-banner .small{font-size:18px;color:#ffd23b;}
  .sp-music{position:absolute;top:10px;right:12px;z-index:8;width:38px;height:38px;border:none;border-radius:50%;
    background:rgba(0,0,0,.42);color:#fff;font-size:18px;cursor:pointer;display:none;}
  body.azv-fs .sp-music{top:66px;}
  body.azv-fs .fs-exit{z-index:20;} body.azv-fs .sp-music{z-index:20;}
  #stage:fullscreen canvas#game, #stage:-webkit-full-screen canvas#game,
  body.azv-pseudofs #stage canvas#game{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;}
  `;
  document.head.appendChild(s);
})();

const stage = document.getElementById("stage");
const hud = document.createElement("div"); hud.className = "sp-hud";
hud.innerHTML = '<div><span class="pill" id="hud-hp"></span></div><div class="right"><span class="pill" id="hud-info"></span></div>';
stage.appendChild(hud);
const banner = document.createElement("div"); banner.className = "sp-banner";
banner.innerHTML = '<div class="small"></div><div class="big"></div>'; stage.appendChild(banner);
const musicBtn = document.createElement("button"); musicBtn.className = "sp-music"; musicBtn.textContent = "🔊"; musicBtn.title = "Glasba";
stage.appendChild(musicBtn);
musicBtn.addEventListener("click", () => { musicBtn.textContent = Music.toggleMute() ? "🔊" : "🔇"; });

function updateHud() {
  hud.style.display = gameOn ? "flex" : "none";
  if (!gameOn) return;
  document.getElementById("hud-hp").textContent = "❤".repeat(Math.max(0, lives)) + "🖤".repeat(Math.max(0, maxLives - lives));
  const boss = enemies.find((e) => e.type === "boss");
  const left = bossSpawned ? (boss ? "👑 " + "▮".repeat(Math.max(1, Math.ceil(boss.hp / boss.maxHp * 8))) : "👑 ✔") : (diff.total - kills);
  document.getElementById("hud-info").textContent = "✂️ " + T.hudScissors + ": " + left + " · 🏹 " + arrows + (bolts > 0 ? " · 🎯 " + bolts : "");
}
let bannerTimer = null;
function showBanner(small, big, ms = 1800) {
  banner.querySelector(".small").textContent = small; banner.querySelector(".big").textContent = big;
  banner.classList.add("show"); clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => banner.classList.remove("show"), ms);
}

function showScreen(html) { overlay.innerHTML = '<div class="sp-card">' + html + "</div>"; overlay.classList.add("show"); scheduleFit(); return overlay.querySelector(".sp-card"); }
function hideScreen() { overlay.classList.remove("show"); overlay.innerHTML = ""; }
function fitOverlay() {
  if (!overlay.classList.contains("show")) return;
  const card = overlay.firstElementChild; if (!card) return;
  card.style.transformOrigin = "center center"; card.style.transform = "none";
  const availH = stage.clientHeight - 10, availW = stage.clientWidth - 10;
  const ch = card.offsetHeight, cw = card.offsetWidth;
  if (ch > 0 && cw > 0) { const s = Math.min(1, availH / ch, availW / cw); if (s < 0.999) card.style.transform = "scale(" + s + ")"; }
}
let fitPending = false;
function scheduleFit() { if (fitPending) return; fitPending = true; requestAnimationFrame(() => requestAnimationFrame(() => { fitPending = false; fitOverlay(); })); }
new MutationObserver(scheduleFit).observe(overlay, { childList: true, subtree: true });
window.addEventListener("resize", scheduleFit);
["fullscreenchange", "webkitfullscreenchange", "orientationchange"].forEach((ev) => window.addEventListener(ev, () => setTimeout(scheduleFit, 120)));

/* ===========================================================
   ZASLONI: naslovnica, zgodba (pripoveduje Jakob), težavnost
   =========================================================== */
function treasureLine() {
  const parts = TREASURES.filter((t) => treasure[t.id] > 0).map((t) => t.icon + "×" + treasure[t.id]);
  return '<div class="sp-treas">🎁 ' + T.treasures + " " + (parts.length ? "<b>" + parts.join("  ") + "</b>" : T.noTreasure) + "</div>";
}
function showIntro() {
  engine.paused = true; gameOn = false; updateHud();
  const card = showScreen('<div style="font-size:54px;line-height:1.1">📄⚔️✂️</div>' +
    '<div class="sp-h" style="font-size:30px">' + T.title + '</div><div class="sp-sub">' + T.tagline + "</div>" + treasureLine());
  const b = document.createElement("button"); b.className = "sp-btn"; b.textContent = T.start;
  b.onclick = () => { SFX.click(); showStory(0); };
  card.appendChild(b);
}
function showStory(i) {
  if (i >= T.story.length) { showDiffSelect(); return; }
  const card = showScreen('<div class="sp-by">🎤 ' + T.storyBy + '</div><div class="sp-sub">' + (i + 1) + " / " + T.story.length + '</div><div class="sp-msg">' + T.story[i] + "</div>");
  const b = document.createElement("button"); b.className = "sp-btn";
  b.textContent = (i === T.story.length - 1) ? T.pickDiff + " ▶" : T.next;
  b.onclick = () => { SFX.click(); showStory(i + 1); };
  card.appendChild(b);
}
function showDiffSelect() {
  engine.paused = true; gameOn = false; updateHud();
  const card = showScreen('<div class="sp-h">' + T.pickDiff + '</div><div class="sp-diffs"></div>');
  const list = card.querySelector(".sp-diffs");
  DIFFS.forEach((d) => {
    const b = document.createElement("button"); b.className = "sp-diff";
    b.innerHTML = "<span><div>" + d.name[LANG] + '</div><div class="sp-diffsub">✂️ ' + d.total + " " + T.scissors + "</div></span>" +
      "<span style='color:#e23b3b'>" + "❤".repeat(d.lives + treasure.hearts) + "</span>";
    b.onclick = () => { SFX.click(); diff = d; startGame(); };
    list.appendChild(b);
  });
}

/* ===========================================================
   ZAČETEK IGRE
   =========================================================== */
function clearArrays() { [enemies, pShots, pickups, fx].forEach((arr) => { arr.forEach((o) => engine.remove(o.group)); arr.length = 0; }); }
function buildPlayer() {
  if (player) engine.remove(player);
  player = makePaper({ scale: 1.35 });
  const w = cellToWorld(startCell.r, startCell.c);
  player.position.set(w.x, 0, w.z);
  engine.add(player); engine.setPlayer(player);
}
function startGame() {
  hideScreen(); clearArrays();
  generateMaze(); buildWorld(); buildPlayer();
  treasure = loadTreasure();
  maxLives = diff.lives + treasure.hearts; lives = maxLives;
  arrows = 12 + treasure.arrows * 6; bolts = 0; kills = 0; spawned = 0;
  fireCd = swordCd = invuln = swordAnim = bowAnim = 0;
  spawnTimer = 0.5; introTimer = 1.5;
  bossSpawned = false; bossDead = false; caseOpen = false;
  engine.speed = 6.8 + treasure.speed * 0.6;
  setRangedModel();
  gameOn = true; engine.paused = false;
  musicBtn.style.display = "block"; Music.start(); Music.setMood("explore");
  showBanner("🌵", T.title, 1600);
  updateHud();
}
function setRangedModel() {
  if (!player) return;
  player.userData.bow.visible = bolts <= 0;
  player.userData.crossbow.visible = bolts > 0;
}

/* ===========================================================
   ŠKARJE: pojavljanje, pot skozi labirint, skok, striženje
   =========================================================== */
function spawnCellFarFromPlayer() {
  const pc = playerCell || startCell, d = bfsFrom(pc), p = player.position;
  const cand = [], far = [];
  d.forEach((v, cell) => {
    if (v < 3 || cell === endCell) return;
    const w = cellToWorld(cell.r, cell.c);
    cand.push(cell);
    if (Math.hypot(w.x - p.x, w.z - p.z) > 12) far.push(cell);
  });
  const pool = far.length ? far : (cand.length ? cand : [endCell]);
  return pool[Math.floor(Math.random() * pool.length)];
}
function spawnScissors() {
  const cell = spawnCellFarFromPlayer(), w = cellToWorld(cell.r, cell.c);
  const rings = [["#e2453b", "#2f6fe0"], ["#ffb02e", "#2ca06a"], ["#7a4ed0", "#ff6fa0"], ["#2f6fe0", "#2f6fe0"]][Math.floor(Math.random() * 4)];
  const g = makeScissors({ ringA: rings[0], ringB: rings[1], scale: 1.15 });
  g.position.set(w.x + rnd(-0.6, 0.6), 0, w.z + rnd(-0.6, 0.6));
  engine.add(g);
  enemies.push({ type: "scissors", group: g, hp: diff.hp, maxHp: diff.hp, r: 0.75, spd: 3.3 * diff.spd, cur: cell, next: cell,
    leapCd: rnd(diff.leapEvery[0], diff.leapEvery[1]) + 1, leapRange: 8, leaping: false, atkCd: 0.5, snip: 0, bob: rnd(0, TAU) });
  spawnPuff(g.position, "#e8cb8c");
  spawned++;
}
function spawnBoss() {
  const w = cellToWorld(endCell.r, endCell.c);
  const g = makeScissors({ metal: "#aab2bb", ringA: "#2b2b2b", ringB: "#2b2b2b", scale: 2.3 });
  // pred puščico (proti igralcu), da ne stoji v njej
  const p = player.position; let dx = p.x - w.x, dz = p.z - w.z; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
  g.position.set(w.x, 0, w.z); g.rotation.y = Math.atan2(dx, dz);
  engine.add(g);
  const hp = diff.bossHp;
  enemies.push({ type: "boss", group: g, hp, maxHp: hp, r: 1.5, spd: 2.6 * diff.spd, cur: endCell, next: endCell,
    leapCd: 2.5, leapRange: 10, leaping: false, atkCd: 0.8, snip: 0, bob: 0 });
  bossSpawned = true; SFX.boss(); Music.setMood("battle");
  showBanner(T.bossSub, T.bossBanner, 2400);
  updateHud();
}
function aliveMinions() { return enemies.filter((e) => e.type === "scissors").length; }

function startLeap(e) {
  const p = player.position, ep = e.group.position;
  e.leaping = true; e.leapT = 0; e.leapDur = 0.55;
  e.lx0 = ep.x; e.lz0 = ep.z; e.lx1 = p.x; e.lz1 = p.z;
  e.group.rotation.y = Math.atan2(p.x - ep.x, p.z - ep.z);
  SFX.leap();
}
function stepEnemy(e, dt) {
  const p = player.position, ep = e.group.position;
  const dist = Math.hypot(p.x - ep.x, p.z - ep.z) || 1;
  if (e.leaping) {
    e.leapT += dt; const k = Math.min(1, e.leapT / e.leapDur);
    ep.x = lerp(e.lx0, e.lx1, k); ep.z = lerp(e.lz0, e.lz1, k); ep.y = Math.sin(k * Math.PI) * 1.6;
    setBlades(e.group, 0.55);
    if (k >= 1) {
      e.leaping = false; ep.y = 0; SFX.land(); spawnPuff(ep, "#e8cb8c");
      e.cur = cellOf(ep.x, ep.z) || e.cur; e.next = e.cur;
      e.leapCd = rnd(diff.leapEvery[0], diff.leapEvery[1]) * (e.type === "boss" ? 0.7 : 1);
      if (Math.hypot(p.x - ep.x, p.z - ep.z) < e.r + 0.9) { hurtPlayer(1); e.snip = 0.3; SFX.snip(); }
    }
    return;
  }
  // skok: od daleč, po ravni črti brez kaktusov
  e.leapCd -= dt;
  if (e.leapCd <= 0 && dist > 2.4 && dist < e.leapRange && losClear(ep.x, ep.z, p.x, p.z)) { startLeap(e); return; }
  // hoja po labirintu (od sredine do sredine celic — nikoli skozi kaktuse)
  const stopAt = e.r + 0.45;
  if (e.cur === playerCell) {
    e.chasing = true;
    if (dist > stopAt) { ep.x += (p.x - ep.x) / dist * e.spd * dt; ep.z += (p.z - ep.z) / dist * e.spd * dt; }
    e.group.rotation.y = Math.atan2(p.x - ep.x, p.z - ep.z);
  } else {
    if (e.chasing) { e.chasing = false; e.next = e.cur; }   // po lovu najprej nazaj na sredino celice
    if (!e.next) {
      let best = e.cur, bd = distMap.get(e.cur);
      for (const n of e.cur.links) { const v = distMap.get(n); if (v !== undefined && v < bd) { bd = v; best = n; } }
      e.next = best;
    }
    const tw = cellToWorld(e.next.r, e.next.c);
    const tx = tw.x - ep.x, tz = tw.z - ep.z, td = Math.hypot(tx, tz);
    if (td < 0.2) { e.cur = e.next; e.next = null; }
    else {
      const step = Math.min(td, e.spd * dt);
      ep.x += tx / td * step; ep.z += tz / td * step;
      e.group.rotation.y = Math.atan2(tx, tz);
    }
  }
  // poskakovanje med hojo
  e.bob += dt * 9; ep.y = Math.abs(Math.sin(e.bob)) * 0.12;
  // striženje (od blizu)
  if (dist < e.r + 0.8) {
    e.atkCd -= dt;
    if (e.atkCd <= 0) { hurtPlayer(1); e.atkCd = e.type === "boss" ? 0.9 : 1.1; e.snip = 0.3; SFX.snip(); }
  } else e.atkCd = Math.min(e.atkCd, 0.45);
  // rezila: med striženjem hitro cak-cak, sicer počasi odprta
  if (e.snip > 0) { e.snip -= dt; setBlades(e.group, 0.05 + 0.5 * Math.abs(Math.sin(e.snip * 40))); }
  else setBlades(e.group, 0.28 + Math.sin(e.bob * 0.5) * 0.08);
}

/* ===========================================================
   IGRALEC: lok / samostrel / meč, škoda, pobiranje
   =========================================================== */
function facingVec() { const f = engine.facing || 0; return { x: Math.sin(f), z: Math.cos(f) }; }
const AIM_CONE = 0.55, AIM_RANGE = 15;   // rahli auto-aim v stožcu pred igralcem
function aimVec() {
  const f = facingVec(), p = player.position;
  let best = null, bestD = 1e9;
  for (const e of enemies) {
    const dx = e.group.position.x - p.x, dz = e.group.position.z - p.z, d = Math.hypot(dx, dz) || 1;
    if (d > AIM_RANGE) continue;
    const dot = (dx / d) * f.x + (dz / d) * f.z;
    if (dot >= AIM_CONE && d < bestD && losClear(p.x, p.z, e.group.position.x, e.group.position.z)) { bestD = d; best = { x: dx / d, z: dz / d }; }
  }
  return best || f;
}
function shoot() {
  if (!gameOn || engine.paused || fireCd > 0) return;
  const useBolt = bolts > 0;
  if (!useBolt && arrows <= 0) { fireCd = 0.3; SFX.empty(); showBanner("🏹 0", T.noArrows, 1400); return; }
  const f = aimVec(); player.rotation.y = Math.atan2(f.x, f.z); engine.facing = player.rotation.y;
  const g = makeArrow(useBolt); const p = player.position;
  g.position.set(p.x + f.x * 0.7, 0.85, p.z + f.z * 0.7); g.rotation.y = Math.atan2(f.x, f.z); engine.add(g);
  const spd = useBolt ? 27 : 21;
  pShots.push({ group: g, vx: f.x * spd, vz: f.z * spd, life: useBolt ? 1.1 : 1.3, dmg: useBolt ? 2 : 1, bolt: useBolt, lastX: g.position.x, lastZ: g.position.z });
  if (useBolt) { bolts--; SFX.crossbow(); fireCd = 0.24; if (bolts <= 0) setRangedModel(); }
  else { arrows--; SFX.bow(); fireCd = 0.42; }
  bowAnim = 0.18; updateHud();
}
function swingSword() {
  if (!gameOn || engine.paused || swordCd > 0) return;
  swordCd = 0.4; swordAnim = 0.26; SFX.sword();
  const reach = 3.0, f = facingVec(), p = player.position, dmg = 2 + treasure.sword;
  for (const e of enemies) {
    const dx = e.group.position.x - p.x, dz = e.group.position.z - p.z, d = Math.hypot(dx, dz) || 1;
    if (d < reach + e.r) {
      const dot = (dx / d) * f.x + (dz / d) * f.z;
      if (dot > 0.1 || d < e.r + 0.8) { damageEnemy(e, dmg, true); }
    }
  }
}
function damageEnemy(e, dmg, knock) {
  e.hp -= dmg; SFX.hit(); e.snip = Math.max(e.snip, 0.15);
  if (knock && !e.leaping && e.type !== "boss") {
    // rahel odriv nazaj (le če tam ni kaktusa)
    const p = player.position, ep = e.group.position, dx = ep.x - p.x, dz = ep.z - p.z, d = Math.hypot(dx, dz) || 1;
    const nx = ep.x + dx / d * 0.6, nz = ep.z + dz / d * 0.6;
    if (!solid(nx, nz) && cellOf(nx, nz) === e.cur) { ep.x = nx; ep.z = nz; }
  }
  if (e.hp <= 0) killEnemy(e);
  updateHud();
}
function killEnemy(e) {
  const i = enemies.indexOf(e); if (i < 0) return;
  enemies.splice(i, 1); engine.remove(e.group);
  spawnBoom(e.group.position, e.type === "boss"); SFX.break_();
  if (e.type === "boss") { bossDead = true; openCase(); return; }
  kills++;
  const pos = e.group.position;
  if (kills % 10 === 0) { dropPickup(pos, "crossbow"); dropPickup({ x: pos.x + 0.9, z: pos.z + 0.4 }, "quiver"); showBanner("🎯", T.got10, 2000); SFX.big(); }
  else if (kills % 5 === 0) { dropPickup(pos, "quiver"); showBanner("🏹", T.got5, 2000); SFX.big(); }
  else if (lives < maxLives && Math.random() < 0.2) dropPickup(pos, "heart");
  if (kills >= diff.total && !bossSpawned) spawnBoss();
  updateHud();
}
function dropPickup(pos, kind) {
  let g, n = 0, life = 40;
  if (kind === "quiver") { g = makeQuiver(); n = 8; }
  else if (kind === "crossbow") { g = makeCrossbowPickup(); n = 20; }
  else if (kind === "heart") { g = makeHeart(); life = 16; }
  else { g = makeStuckArrow(); n = 1; life = 30; }
  // če je točka v kaktusu, potisni proti sredini celice
  let x = pos.x, z = pos.z;
  const cell = cellOf(x, z) || playerCell || startCell, w = cellToWorld(cell.r, cell.c);
  if (solid(x, z)) { x = w.x + (x - w.x) * 0.6; z = w.z + (z - w.z) * 0.6; }
  g.position.set(x, 0, z); engine.add(g);
  pickups.push({ group: g, kind, n, life });
}
function hurtPlayer(dmg) {
  if (invuln > 0 || !gameOn) return;
  lives -= dmg; invuln = 1.1; SFX.hurt(); updateHud();
  if (lives <= 0) gameOver();
}
function openCase() {
  caseOpen = true; SFX.open(); Music.setMood("explore");
  if (pencilCase) { pencilCase.userData.treasure.visible = true; pencilCase.userData.lock.material.color.set("#5cff7a"); }
  showBanner("🎁", T.opened, 2600);
}

/* učinki */
function spawnPuff(pos, color) {
  const ring = glow(new THREE.TorusGeometry(0.25, 0.08, 8, 18), color || "#ffffff"); ring.rotation.x = -Math.PI / 2;
  ring.position.set(pos.x, 0.15, pos.z); engine.add(ring);
  fx.push({ group: ring, life: 0.3, max: 0.3, grow: 7 });
}
function spawnBoom(pos, big) {
  const ring = glow(new THREE.TorusGeometry(0.3, 0.1, 8, 20), big ? "#ff7b3c" : "#cfd6de"); ring.rotation.x = -Math.PI / 2;
  ring.position.set(pos.x, 0.5, pos.z); engine.add(ring);
  fx.push({ group: ring, life: 0.45, max: 0.45, grow: big ? 16 : 10 });
}

/* ===========================================================
   ZAKLJUČEK: zmaga (izbira zaklada), poraz
   =========================================================== */
function playAgain() { SFX.click(); clearArrays(); hideScreen(); showDiffSelect(); }
function gameOver() {
  gameOn = false; engine.paused = true; updateHud(); SFX.over(); Music.setMood("explore");
  const card = showScreen('<div class="sp-h">' + T.over + '</div><div class="sp-sub">' + T.overSub + "</div>");
  const b = document.createElement("button"); b.className = "sp-btn"; b.textContent = T.again;
  b.onclick = playAgain; card.appendChild(b);
}
function win() {
  gameOn = false; engine.paused = true; updateHud(); SFX.win(); Music.setMood("explore");
  const avail = TREASURES.filter((t) => treasure[t.id] < t.max);
  // ponudi do 3 naključne zaklade, ki še niso na maksimumu
  const offer = avail.sort(() => Math.random() - 0.5).slice(0, 3);
  const card = showScreen('<div style="font-size:48px">🎁📄</div><div class="sp-h">' + T.win + '</div><div class="sp-sub">' + T.winSub + "</div>" +
    (offer.length ? '<div class="sp-msg" style="font-size:16px">' + T.pickTreasure + '</div><div class="sp-rewards"></div>' : '<div class="sp-msg">' + T.allMax + "</div>"));
  const row = card.querySelector(".sp-rewards");
  function finish(msg) {
    const c2 = showScreen('<div style="font-size:48px">🏆</div><div class="sp-msg">' + msg + "</div>" + treasureLine() + '<div class="sp-teaser">' + T.teaser + "</div>");
    const b = document.createElement("button"); b.className = "sp-btn"; b.textContent = T.again; b.onclick = playAgain; c2.appendChild(b);
  }
  if (!offer.length) { finish(T.allMax); return; }
  offer.forEach((t) => {
    const b = document.createElement("button"); b.className = "sp-reward";
    b.innerHTML = '<div class="ic">' + t.icon + '</div><div class="nm">' + t.name[LANG] + '</div><div class="ds">' + t.desc[LANG] + "</div>";
    b.onclick = () => { SFX.big(); treasure[t.id] = Math.min(t.max, treasure[t.id] + 1); saveTreasure(treasure); finish(T.saved); };
    row.appendChild(b);
  });
}

/* ===========================================================
   GLAVNA ZANKA (fiksni korak 60 Hz)
   =========================================================== */
engine.onStep = (dt) => {
  // okras: pobiranja se vrtijo, zaklad v puščici se vrti
  pickups.forEach((pk) => { pk.group.rotation.y += 0.03; if (pk.group.userData.halo) pk.group.userData.halo.rotation.z += 0.05; });
  if (pencilCase && caseOpen) { const tr = pencilCase.userData.treasure; tr.rotation.y += 0.03; tr.position.y = Math.sin(performance.now() * 0.003) * 0.12; pencilCase.userData.lid.rotation.x = Math.max(-1.3, pencilCase.userData.lid.rotation.x - 0.03); }
  // animacija meča in loka
  if (player) {
    const sw = player.userData.sword;
    if (swordAnim > 0) { swordAnim -= dt; sw.rotation.x = 1.5 * Math.sin((0.26 - Math.max(0, swordAnim)) / 0.26 * Math.PI); } else sw.rotation.x = 0;   // zamah NAPREJ (+Z)
    const bw = bolts > 0 ? player.userData.crossbow : player.userData.bow;
    if (bowAnim > 0) { bowAnim -= dt; const s = 1 + 0.25 * Math.sin(bowAnim / 0.18 * Math.PI); bw.scale.set(s, s, s); } else bw.scale.set(1, 1, 1);
  }
  if (!gameOn || engine.paused) return;

  const p = player.position;
  playerCell = cellOf(p.x, p.z) || playerCell || startCell;
  distMap = bfsFrom(playerCell);
  if (fireCd > 0) fireCd -= dt;
  if (swordCd > 0) swordCd -= dt;
  if (invuln > 0) { invuln -= dt; player.visible = (Math.floor(invuln * 12) % 2 === 0); } else player.visible = true;

  // tipkovnica: preslednica = lok/samostrel, M = meč
  if (engine.keys[" "]) shoot();
  if (engine.keys["m"]) swingSword();

  // pojavljanje škarij
  if (introTimer > 0) introTimer -= dt;
  else if (spawned < diff.total) {
    spawnTimer -= dt;
    if (spawnTimer <= 0 && aliveMinions() < diff.maxAlive) { spawnScissors(); spawnTimer = rnd(1.4, 2.4); }
  }

  // puščice / strelice
  for (const s of pShots) {
    const g = s.group;
    s.lastX = g.position.x; s.lastZ = g.position.z;
    g.position.x += s.vx * dt; g.position.z += s.vz * dt; s.life -= dt;
    let hit = false;
    for (const e of enemies) {
      if (Math.hypot(g.position.x - e.group.position.x, g.position.z - e.group.position.z) < e.r + 0.3 && e.group.position.y < 1.0) {
        damageEnemy(e, s.dmg, false); hit = true; break;
      }
    }
    if (hit) { s.dead = true; continue; }
    if (solid(g.position.x, g.position.z) || s.life <= 0) {
      s.dead = true;
      if (!s.bolt) dropPickup({ x: s.lastX, z: s.lastZ }, "arrow");   // puščica ostane na tleh — poberi jo
    }
  }
  prune(pShots);

  // škarje
  for (const e of enemies) stepEnemy(e, dt);

  // pobiranje
  for (const pk of pickups) {
    pk.life -= dt;
    if (pk.life <= 0) { pk.dead = true; continue; }
    if (Math.hypot(pk.group.position.x - p.x, pk.group.position.z - p.z) < 1.2) {
      if (pk.kind === "heart") { if (lives < maxLives) lives++; SFX.heal(); }
      else if (pk.kind === "crossbow") { bolts += pk.n; setRangedModel(); SFX.big(); }
      else { arrows += pk.n; SFX.pickup(); }
      pk.dead = true; updateHud();
    }
  }
  prune(pickups);

  // učinki
  for (const f of fx) { f.life -= dt; const s = 1 + (f.max - f.life) * f.grow; f.group.scale.set(s, s, s); f.group.material.transparent = true; f.group.material.opacity = Math.max(0, f.life / f.max); if (f.life <= 0) f.dead = true; }
  prune(fx);

  // cilj: odprta puščica
  if (caseOpen && pencilCase && Math.hypot(pencilCase.position.x - p.x, pencilCase.position.z - p.z) < 1.9) win();
};
function prune(arr) { for (let i = arr.length - 1; i >= 0; i--) if (arr[i].dead) { engine.remove(arr[i].group); arr.splice(i, 1); } }

// začetni svet (za ozadje naslovnice) + zasloni
generateMaze(); buildWorld(); buildPlayer();
engine.start();
showIntro();

/* ===========================================================
   MOBILNE KONTROLE: joystick = premik, gumba = lok + meč
   =========================================================== */
if (window.azvRegisterControls) {
  window.azvRegisterControls({
    primary: () => shoot(),
    secondary: () => swingSword(),
    primaryLabel: "🏹",
    secondaryLabel: "⚔️",
    axis: "both",
  });
}

/* ob preklopu celozaslonskega zanesljivo osveži velikost platna */
(function () {
  const ping = () => [80, 350, 700].forEach((d) => setTimeout(() => window.dispatchEvent(new Event("resize")), d));
  document.querySelectorAll(".fs-enter, .fs-exit").forEach((b) => b.addEventListener("click", ping));
})();

