/* ===========================================================
   BOJEVANJE DLAK  (avtor zgodbe: Simon)
   3D vesoljska akcija (slog "Vojne zvezd" s hrčki).
   Izbereš močhrčka (vsak ima svojo črko in posebnost), nato se
   PROSTO premikaš po odprti vesoljski areni. Boriš se z VODIKOM
   (vodni meč) in pobranimi vodnimi puškami proti robotom, sovražnim
   hrčkom, sondam in raketam. Prebij se skozi 4 Marse (planete,
   poimenovane po hrani); na zadnjem te čaka robotski poveljnik.

   3D pogon je v ./lib/iso-engine.js; tu je vsa vsebina (svet, modeli,
   nasprotniki, boj, nivoji). Brez sten — areno omejuje le obroč.
   =========================================================== */
import { IsoEngine, box, THREE } from "./lib/iso-engine.js";

const canvas = document.getElementById("game");

/* ---------- arena (krožna, brez sten) ---------- */
const ARENA_R = 23;
function solid(x, z) { return Math.hypot(x, z) > ARENA_R; }   // ostani znotraj obroča

/* ---------- pogon ---------- */
const engine = new IsoEngine(canvas, {
  viewSize: 13,
  bg: "#070a18",
  camOffset: new THREE.Vector3(0, 19.5, 13.5),   // dvignjena kamera, gor = gor
  solid,
  speed: 7.4,
  radius: 0.5,
});
engine.scene.fog = null;                          // da se vidijo oddaljeni planeti

/* ---------- mali pomočniki ---------- */
function ball(r, color, opts = {}) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), new THREE.MeshLambertMaterial({ color }));
  m.castShadow = opts.cast !== false; m.receiveShadow = opts.receive !== false; return m;
}
function glow(geo, color) { return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color })); }
function rnd(a, b) { return a + Math.random() * (b - a); }
const TAU = Math.PI * 2;

/* črka na prsih (tekstura na ploščici) */
function letterTexture(ch) {
  const cv = document.createElement("canvas"); cv.width = cv.height = 128;
  const x = cv.getContext("2d");
  x.clearRect(0, 0, 128, 128);
  x.fillStyle = "#ffffff"; x.font = "bold 104px 'Baloo 2', sans-serif";
  x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(ch, 64, 70);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}
function letterPlate(ch) {
  const t = letterTexture(ch);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42),
    new THREE.MeshBasicMaterial({ map: t, transparent: true }));
  return m;
}

/* ===========================================================
   MODELI (low-poly iz kock in krogel)
   =========================================================== */
/* močhrček (igralec ali sovražni) z vodnim mečem in črko na prsih */
function makeHamster(opts = {}) {
  const fur = opts.fur || "#cfc7bb";
  const suit = opts.suit || "#3a7bd5";
  const blade = opts.blade || "#49d6ff";
  const g = new THREE.Group();
  // čokato telo (obleka)
  const body = box(0.66, 0.6, 0.5, suit); body.position.y = 0.46; g.add(body);
  const belt = box(0.7, 0.1, 0.54, "#222633", { cast: false }); belt.position.y = 0.28; g.add(belt);
  // črka na prsih
  if (opts.letter) { const lp = letterPlate(opts.letter); lp.position.set(0, 0.5, 0.27); g.add(lp); }
  // okrogla glava
  const head = ball(0.36, fur); head.scale.set(1, 0.95, 1.04); head.position.set(0, 0.96, 0.12); g.add(head);
  const cheekL = ball(0.2, fur); cheekL.position.set(-0.22, 0.86, 0.3); g.add(cheekL);
  const cheekR = ball(0.2, fur); cheekR.position.set(0.22, 0.86, 0.3); g.add(cheekR);
  const nose = ball(0.07, "#e98aa6", { cast: false }); nose.position.set(0, 0.86, 0.5); g.add(nose);
  // ušesa
  for (const sx of [-1, 1]) {
    const ear = ball(0.17, fur); ear.scale.set(1, 1, 0.55); ear.position.set(sx * 0.26, 1.24, 0.06); g.add(ear);
    const ein = ball(0.1, "#f0a9c0", { cast: false }); ein.scale.set(1, 1, 0.5); ein.position.set(sx * 0.26, 1.24, 0.11); g.add(ein);
  }
  // oči
  for (const sx of [-1, 1]) { const e = ball(0.06, "#161616", { cast: false }); e.position.set(sx * 0.14, 0.99, 0.42); g.add(e); }
  // roke
  for (const sx of [-1, 1]) { const arm = box(0.15, 0.34, 0.15, suit); arm.position.set(sx * 0.44, 0.46, 0.06); g.add(arm); }
  // noge
  for (const sx of [-1, 1]) { const leg = box(0.18, 0.2, 0.22, "#3b3f4a"); leg.position.set(sx * 0.17, 0.1, 0.04); g.add(leg); }
  // rep
  const tail = box(0.09, 0.09, 0.42, "#e9b7c4"); tail.position.set(0, 0.26, -0.42); g.add(tail);
  // VODIK (vodni meč) v desnici — držaj + svetleče rezilo
  const saber = new THREE.Group();
  const hilt = box(0.1, 0.26, 0.1, "#9aa3b2"); hilt.position.y = 0; saber.add(hilt);
  const bladeMesh = glow(new THREE.CylinderGeometry(0.07, 0.05, 1.15, 10), blade);
  bladeMesh.position.y = 0.7; saber.add(bladeMesh);
  const tip = glow(new THREE.SphereGeometry(0.09, 8, 8), "#dffaff"); tip.position.y = 1.28; saber.add(tip);
  saber.position.set(0.52, 0.6, 0.16);
  g.add(saber); g.userData.saber = saber;
  return g;
}

/* robot — tanko telo, velika glava (mucasti obraz), drži vodno puško */
function makeRobot(opts = {}) {
  const metal = opts.metal || "#9aa6b8";
  const dark = "#5b6473";
  const g = new THREE.Group();
  // noge
  for (const sx of [-1, 1]) { const leg = box(0.12, 0.4, 0.12, dark); leg.position.set(sx * 0.14, 0.2, 0); g.add(leg); }
  // tanko telo
  const body = box(0.34, 0.6, 0.26, metal); body.position.y = 0.7; g.add(body);
  const core = glow(new THREE.SphereGeometry(0.08, 8, 8), "#ff7b3c"); core.position.set(0, 0.72, 0.15); g.add(core);
  // velika glava
  const head = box(0.62, 0.5, 0.5, metal); head.position.y = 1.28; g.add(head);
  // mucasta ušesa
  for (const sx of [-1, 1]) { const ear = box(0.16, 0.2, 0.1, metal); ear.position.set(sx * 0.22, 1.6, 0); ear.rotation.z = sx * 0.2; g.add(ear); }
  // svetleče oči
  for (const sx of [-1, 1]) { const e = glow(new THREE.BoxGeometry(0.14, 0.1, 0.05), "#ff4d4d"); e.position.set(sx * 0.16, 1.32, 0.26); g.add(e); }
  // brčice (antene)
  for (const sx of [-1, 1]) for (const dy of [0, -0.08]) { const w = box(0.3, 0.02, 0.02, dark, { cast: false }); w.position.set(sx * 0.34, 1.2 + dy, 0.26); w.rotation.y = sx * 0.4; g.add(w); }
  // roke + vodna puška
  for (const sx of [-1, 1]) { const arm = box(0.1, 0.34, 0.1, dark); arm.position.set(sx * 0.28, 0.74, 0.08); g.add(arm); }
  const gun = new THREE.Group();
  gun.add(box(0.16, 0.16, 0.5, "#3a4250"));
  const noz = glow(new THREE.SphereGeometry(0.09, 8, 8), "#49d6ff"); noz.position.z = 0.3; gun.add(noz);
  gun.position.set(0.34, 0.72, 0.3); g.add(gun);
  return g;
}

/* sonda — lebdeča krogla, ki te zasleduje in se razleti ob dotiku */
function makeProbe() {
  const g = new THREE.Group();
  const core = ball(0.34, "#b0344a"); g.add(core);
  const ring = glow(new THREE.TorusGeometry(0.42, 0.05, 8, 20), "#ff9a3c"); ring.rotation.x = Math.PI / 2; g.add(ring);
  const eye = glow(new THREE.SphereGeometry(0.12, 10, 10), "#ffe27a"); eye.position.z = 0.3; g.add(eye);
  g.userData.ring = ring;
  return g;
}

/* raketa — hiter izstrelek s plamenom */
function makeRocket() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.7, 10), new THREE.MeshLambertMaterial({ color: "#d8dde6" }));
  body.rotation.x = Math.PI / 2; g.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 10), new THREE.MeshLambertMaterial({ color: "#e2663b" }));
  nose.rotation.x = Math.PI / 2; nose.position.z = 0.45; g.add(nose);
  const flame = glow(new THREE.ConeGeometry(0.14, 0.4, 8), "#ffc24d"); flame.rotation.x = -Math.PI / 2; flame.position.z = -0.5; g.add(flame);
  g.userData.flame = flame;
  return g;
}

/* puška (pickup) — lebdi in se vrti */
function makeGunPickup(color) {
  const g = new THREE.Group();
  g.add(box(0.2, 0.2, 0.66, "#2f3744"));
  const tip = glow(new THREE.SphereGeometry(0.12, 10, 10), color); tip.position.z = 0.4; g.add(tip);
  const halo = glow(new THREE.TorusGeometry(0.5, 0.04, 8, 22), color); halo.rotation.x = Math.PI / 2;
  const wrap = new THREE.Group(); wrap.add(g); wrap.add(halo);
  wrap.userData.halo = halo;
  return wrap;
}

/* srček (pickup za zdravljenje) — lebdi in se vrti */
function makeHeart() {
  const col = "#ff4d6d";
  const g = new THREE.Group();
  const lobeL = ball(0.2, col); lobeL.position.set(-0.15, 0.12, 0); g.add(lobeL);
  const lobeR = ball(0.2, col); lobeR.position.set(0.15, 0.12, 0); g.add(lobeR);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.46, 14), new THREE.MeshLambertMaterial({ color: col }));
  tip.rotation.x = Math.PI; tip.position.set(0, -0.16, 0); tip.castShadow = true; g.add(tip);
  const shine = glow(new THREE.SphereGeometry(0.06, 8, 8), "#ffd0da"); shine.position.set(-0.12, 0.18, 0.16); g.add(shine);
  const halo = glow(new THREE.TorusGeometry(0.5, 0.05, 8, 24), "#ff9ab0"); halo.rotation.x = Math.PI / 2;
  const wrap = new THREE.Group(); wrap.add(g); wrap.add(halo); wrap.userData.halo = halo;
  wrap.scale.setScalar(1.3);
  return wrap;
}

/* planet v ozadju */
function makePlanet(r, color, ringColor) {
  const g = new THREE.Group();
  const p = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 18), new THREE.MeshLambertMaterial({ color }));
  p.castShadow = false; p.receiveShadow = false; g.add(p);
  if (ringColor) { const ring = glow(new THREE.TorusGeometry(r * 1.5, r * 0.08, 10, 36), ringColor); ring.rotation.x = 1.1; g.add(ring); }
  return g;
}

/* ===========================================================
   STALNI SVET: zvezdno polje + vesoljska ploščad (deck) + obroč
   =========================================================== */
function buildStars() {
  const N = 420, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const rr = rnd(40, 95), th = rnd(0, TAU), ph = rnd(0.1, Math.PI * 0.6);
    pos[i * 3] = Math.cos(th) * Math.sin(ph) * rr;
    pos[i * 3 + 1] = Math.cos(ph) * rr + 20;
    pos[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * rr;
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: "#cfe3ff", size: 0.5, sizeAttenuation: true }));
  engine.add(pts);
}
buildStars();

// ploščad (krožni "krov") + svetleč robni obroč
const deck = new THREE.Mesh(new THREE.CircleGeometry(ARENA_R, 64), new THREE.MeshLambertMaterial({ color: "#1b2336" }));
deck.rotation.x = -Math.PI / 2; deck.position.y = -0.02; deck.receiveShadow = true; engine.add(deck);
const deckGrid = new THREE.Mesh(new THREE.RingGeometry(ARENA_R * 0.5, ARENA_R * 0.51, 64),
  new THREE.MeshBasicMaterial({ color: "#2c3a5a" })); deckGrid.rotation.x = -Math.PI / 2; deckGrid.position.y = 0.01; engine.add(deckGrid);
const edgeRing = glow(new THREE.TorusGeometry(ARENA_R, 0.22, 12, 96), "#49d6ff");
edgeRing.rotation.x = -Math.PI / 2; edgeRing.position.y = 0.05; engine.add(edgeRing);

// skupina ozadja (planeti) — se prezgradi vsak nivo
const backdrop = new THREE.Group(); engine.add(backdrop);

/* ===========================================================
   ZVOK + GLASBA
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
  shoot() { beep(880, 0.08, "square", 0.08, 360); noise(0.05, 0.03); },
  shootBig() { beep(420, 0.16, "sawtooth", 0.12, 120); },
  saber() { beep(300, 0.18, "sine", 0.12, 760); noise(0.1, 0.05, true); },   // švist
  pok() { noise(0.14, 0.14, true); beep(680, 0.08, "square", 0.08, 200); },   // POK (trk/odboj)
  hitEnemy() { beep(240, 0.1, "square", 0.1, 120); },
  boom() { noise(0.3, 0.18, true); beep(120, 0.3, "sawtooth", 0.16, 50); },
  hurt() { beep(200, 0.22, "sawtooth", 0.18, 80); },
  pickup() { seq([660, 880, 1320], 0.06, "triangle", 0.16); },
  heal() { seq([880, 1175, 1568, 1976], 0.07, "triangle", 0.18); },
  enemyShoot() { beep(330, 0.09, "sawtooth", 0.05, 160); },
  level() { seq([523, 659, 784, 1047], 0.1, "triangle", 0.18); },
  win() { seq([523, 659, 784, 1047, 1319, 1568, 2093], 0.13, "triangle", 0.2); },
  over() { seq([400, 320, 250, 170], 0.17, "sawtooth", 0.18); },
};

const Music = (function () {
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  // mirna (vesoljska, durova)
  const EX_MEL = [76, -1, -1, 79, -1, -1, 83, -1, -1, 81, -1, 79, -1, 76, -1, -1];
  const EX_BASS = [40, -1, -1, -1, 47, -1, -1, -1, 45, -1, -1, -1, 43, -1, -1, -1];
  // napeta (boj, molova, gostejša)
  const BT_MEL = [69, 69, 72, 69, 67, 67, 69, 67, 64, 64, 67, 64, 62, 64, 67, 69];
  const BT_BASS = [33, 33, -1, 33, 36, 36, -1, 36, 31, 31, -1, 31, 28, 28, -1, 28];
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
      if (EX_MEL[s] > 0) tone(mtof(EX_MEL[s]), t, 0.55, "triangle", 0.075);
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
   PODATKI: hrčki, težavnost, orožja, nivoji, besedila
   =========================================================== */
const LANG = (typeof localStorage !== "undefined" && localStorage.getItem("azv-lang") === "en") ? "en" : "sl";

// močhrčki — izbereš po črki; vsak ima posebnost (perk)
const HAMSTERS = [
  { letter: "Č", fur: "#cfc7bb", suit: "#3a7bd5", blade: "#49d6ff", name: { sl: "Čombi", en: "Chombi" }, perk: "balanced", perkTxt: { sl: "uravnotežen", en: "balanced" } },
  { letter: "M", fur: "#d8c4a0", suit: "#e2663b", blade: "#ff5a3c", name: { sl: "Močko", en: "Mighto" }, perk: "saber", perkTxt: { sl: "močnejši vodik", en: "stronger saber" } },
  { letter: "S", fur: "#c2cdbb", suit: "#2ca06a", blade: "#7cff8a", name: { sl: "Strelko", en: "Shooto" }, perk: "gun", perkTxt: { sl: "hitrejše streljanje", en: "faster shooting" } },
  { letter: "B", fur: "#cfbfe0", suit: "#7a4ed0", blade: "#c08bff", name: { sl: "Brzina", en: "Speedo" }, perk: "speed", perkTxt: { sl: "hitrejši tek", en: "faster runner" } },
];

// cnt = množitelj števila nasprotnikov, aliveAdj = sprememba sočasno živih,
// rocketMul = množitelj raket, bossMul = množitelj življenj bossa
const DIFFS = [
  { id: "easy", name: { sl: "LAHKO", en: "EASY" }, lives: 7, spd: 0.82, atk: 0.8, cnt: 0.5, aliveAdj: -1, rocketMul: 0.25, bossMul: 0.7 },
  { id: "med", name: { sl: "SREDNJE", en: "MEDIUM" }, lives: 5, spd: 1.0, atk: 1.0, cnt: 1.0, aliveAdj: 0, rocketMul: 1.0, bossMul: 1.0 },
  { id: "hard", name: { sl: "TEŽKO", en: "HARD" }, lives: 4, spd: 1.18, atk: 1.25, cnt: 1.2, aliveAdj: 1, rocketMul: 1.3, bossMul: 1.2 },
];

// orožja: basic (neskončno), pobrana imajo strelivo
const GUNS = {
  basic: { name: { sl: "Vodna pištola", en: "Water pistol" }, cd: 0.26, dmg: 1, speed: 23, color: "#49d6ff", spread: 0, big: false, ammo: Infinity },
  rapid: { name: { sl: "Brzostrelka", en: "Rapid jet" }, cd: 0.1, dmg: 1, speed: 26, color: "#7cff8a", spread: 0, big: false, ammo: 70 },
  spread: { name: { sl: "Trojček", en: "Triple spray" }, cd: 0.42, dmg: 1, speed: 21, color: "#ffd23b", spread: 0.32, big: false, ammo: 30 },
  cannon: { name: { sl: "Vrela kapljica", en: "Boiling drop" }, cd: 0.5, dmg: 3, speed: 19, color: "#ff5a3c", spread: 0, big: true, ammo: 16 },
};
const DROPS = ["rapid", "spread", "cannon"];

// 4 Marsi (planeti, poimenovani po hrani) — naraščajoča težavnost; zadnji ima bossa
const LEVELS = [
  { name: { sl: "Korenčkomars", en: "Carrot-Mars" }, deck: "#243018", grid: "#3c5a28", planet: "#e08a2c", pring: null, minions: 6, maxAlive: 3, spawn: 1.5, spd: 1.0, atk: 1.0, rockets: 0, w: { robot: 0.7, hamster: 0.2, probe: 0.1 }, boss: false },
  { name: { sl: "Avtomars", en: "Auto-Mars" }, deck: "#22262e", grid: "#46506a", planet: "#7f8794", pring: "#aab3c4", minions: 9, maxAlive: 4, spawn: 1.3, spd: 1.08, atk: 1.15, rockets: 7, w: { robot: 0.55, hamster: 0.3, probe: 0.15 }, boss: false },
  { name: { sl: "Zeljomars", en: "Cabbage-Mars" }, deck: "#16301f", grid: "#2c5a3a", planet: "#5fae57", pring: null, minions: 12, maxAlive: 5, spawn: 1.15, spd: 1.16, atk: 1.3, rockets: 9, w: { robot: 0.45, hamster: 0.35, probe: 0.2 }, boss: false },
  { name: { sl: "Sladkoromars", en: "Sugar-Mars" }, deck: "#301a2a", grid: "#5a2c4c", planet: "#ef7fb6", pring: "#ffd0e6", minions: 8, maxAlive: 4, spawn: 1.2, spd: 1.2, atk: 1.35, rockets: 8, w: { robot: 0.5, hamster: 0.35, probe: 0.15 }, boss: true },
];

const T = {
  sl: {
    title: "BOJEVANJE DLAK", tagline: "Močhrčki z vodnimi meči se borijo po vesolju!",
    start: "Začni", start2: "Izberi hrčka 🐹",
    story: [
      "Daleč, daleč v vesolju vlada vojna med MOČHRČKI in roboti. 🤖",
      "Močhrčki nimajo laserjev — borijo se z VODIKOM, mečem iz vrele vode. 💧⚔️",
      "Robotom lahko vzameš puško in jo obdržiš. Pazi tudi na sonde in rakete!",
      "Prebij se skozi vse Marse in premagaj robotskega poveljnika. Pogum, hrček!",
    ],
    pickH: "Izberi močhrčka", pickHSub: "Vsak ima svojo črko in posebnost",
    pickDiff: "Izberi težavnost", lives: "življenja",
    weapon: "Orožje", ammo: "naboji", enemies: "Nasprotniki",
    levelClear: "Mars očiščen!", next: "Naprej ▶",
    win: "ZMAGA! 🏆", winSub: "Premagal si robotskega poveljnika in osvobodil vesolje! Bravo!",
    over: "KONEC 💔", overSub: "Tvoj hrček je premagan.",
    again: "Še enkrat",
    boss: "ROBOTSKI POVELJNIK 🤖", final: "ZADNJI BOJ!",
  },
  en: {
    title: "BATTLE OF FURS", tagline: "Power-hamsters with water swords fight across space!",
    start: "Start", start2: "Choose a hamster 🐹",
    story: [
      "Far, far in space a war rages between the POWER-HAMSTERS and robots. 🤖",
      "Hamsters have no lasers — they fight with the WATER SWORD, a blade of boiling water. 💧⚔️",
      "You can take a robot's gun and keep it. Watch out for probes and rockets too!",
      "Fight through every Mars and beat the robot commander. Be brave, hamster!",
    ],
    pickH: "Choose a power-hamster", pickHSub: "Each has its own letter and perk",
    pickDiff: "Choose difficulty", lives: "lives",
    weapon: "Weapon", ammo: "ammo", enemies: "Enemies",
    levelClear: "Mars cleared!", next: "Next ▶",
    win: "VICTORY! 🏆", winSub: "You beat the robot commander and freed the galaxy! Well done!",
    over: "GAME OVER 💔", overSub: "Your hamster is defeated.",
    again: "Play again",
    boss: "ROBOT COMMANDER 🤖", final: "FINAL BATTLE!",
  },
}[LANG];

/* ===========================================================
   STANJE
   =========================================================== */
const overlay = document.getElementById("ui-overlay");
let chosenH = HAMSTERS[0], diff = DIFFS[1];
let lives = 5, gameOn = false;
let player = null;
let levelIdx = 0;

// boj
const enemies = [];      // {type, group, hp, r, shootCd, ...}
const pShots = [];       // izstrelki igralca
const eShots = [];       // izstrelki nasprotnikov
const pickups = [];      // pobiranje pušk
const fx = [];           // učinki (POK obroči ipd.)
let gun = GUNS.basic, gunKey = "basic", ammo = Infinity;
let fireCd = 0, saberCd = 0, invuln = 0, saberAnim = 0;
let saberMul = 1, gunCdMul = 1;

// upravljanje nivoja
let spawnedMin = 0, minRemaining = 0, rocketsLeft = 0, levelMinions = 0, levelMaxAlive = 0;
let spawnTimer = 0, rocketTimer = 0, introTimer = 0, heartTimer = 0;
let bossSpawned = false, bossDead = false, transitioning = false;

/* ===========================================================
   UI (CSS, HUD, prilagajanje okvirju) — vzorec iz Bojevniških mišk
   =========================================================== */
(function injectUi() {
  const s = document.createElement("style");
  s.textContent = `
  #ui-overlay{position:absolute;inset:0;display:none;align-items:center;justify-content:center;z-index:10;padding:8px;}
  #ui-overlay.show{display:flex;}
  .bd-card{background:#fdfdf7;border:5px solid #2b2b2b;border-radius:20px;padding:16px 20px;width:min(88%,560px);
    box-shadow:0 10px 30px rgba(0,0,0,.45);font-family:"Baloo 2",sans-serif;text-align:center;color:#1a1a1a;}
  .bd-h{font-weight:800;font-size:24px;margin:0 0 4px;}
  .bd-sub{color:#666;font-size:14px;margin:0 0 14px;}
  .bd-selrow{display:flex;gap:12px;align-items:stretch;flex-wrap:wrap;justify-content:center;}
  .bd-list{display:flex;flex-direction:column;gap:8px;flex:1 1 240px;min-width:230px;}
  .bd-opt{display:flex;align-items:center;gap:12px;padding:10px;border-radius:14px;border:3px solid #2b2b2b;background:#fff;cursor:pointer;text-align:left;font-family:inherit;}
  .bd-opt:active{transform:scale(.98);}
  .bd-opt.on{border-color:#2f6fe0;background:#e7f0ff;box-shadow:0 0 0 3px rgba(47,111,224,.45) inset;}
  .bd-prevwrap{flex:0 0 168px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0c1226;border-radius:16px;border:3px solid #2b2b2b;padding:6px;}
  .bd-prev{width:160px;height:125px;display:block;}
  .bd-prevname{font-weight:800;font-size:16px;color:#fff;margin-top:2px;}
  .bd-letter{width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:800;flex:0 0 auto;}
  .bd-name{font-weight:800;font-size:20px;} .bd-desc{color:#666;font-size:13px;}
  .bd-diffs{display:flex;flex-direction:column;gap:10px;}
  .bd-diff{font-family:inherit;font-weight:800;font-size:22px;padding:12px 14px;border-radius:14px;border:3px solid #2b2b2b;background:#eaf1ff;cursor:pointer;display:flex;justify-content:space-between;align-items:center;text-align:left;}
  .bd-diff:active{transform:scale(.98);}
  .bd-btn{font-family:inherit;font-weight:800;font-size:20px;padding:12px 26px;border-radius:14px;border:3px solid #2b2b2b;background:#ffd23b;cursor:pointer;margin-top:14px;}
  .bd-btn:active{transform:scale(.97);}
  .bd-msg{font-size:20px;margin:6px 0 4px;line-height:1.4;}
  /* HUD zgoraj */
  .bd-hud{position:absolute;top:10px;left:12px;right:12px;z-index:8;font-family:"Baloo 2",sans-serif;
    display:none;justify-content:space-between;align-items:flex-start;gap:8px;pointer-events:none;}
  .bd-hud{padding-right:46px;}
  .bd-hud .pill{background:rgba(0,0,0,.42);color:#fff;padding:4px 12px;border-radius:18px;font-size:18px;letter-spacing:1px;}
  .bd-hud .right{text-align:right;font-size:15px;}
  /* banner (ime Marsa) */
  .bd-banner{position:absolute;top:38%;left:0;right:0;z-index:9;text-align:center;pointer-events:none;
    font-family:"Baloo 2",sans-serif;color:#fff;text-shadow:0 3px 10px rgba(0,0,0,.7);opacity:0;transition:opacity .3s;}
  .bd-banner.show{opacity:1;}
  .bd-banner .big{font-size:40px;font-weight:800;letter-spacing:1px;}
  .bd-banner .small{font-size:18px;color:#ffd23b;}
  .bd-music{position:absolute;top:10px;right:12px;z-index:8;width:38px;height:38px;border:none;border-radius:50%;
    background:rgba(0,0,0,.42);color:#fff;font-size:18px;cursor:pointer;display:none;}
  body.azv-fs .bd-music{top:66px;}
  body.azv-fs .fs-exit{z-index:20;} body.azv-fs .bd-music{z-index:20;}
  #stage:fullscreen canvas#game, #stage:-webkit-full-screen canvas#game,
  body.azv-pseudofs #stage canvas#game{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;}
  `;
  document.head.appendChild(s);
})();

const stage = document.getElementById("stage");
const hud = document.createElement("div"); hud.className = "bd-hud";
hud.innerHTML = '<div><span class="pill" id="hud-hp"></span></div><div class="right"><span class="pill" id="hud-info"></span></div>';
stage.appendChild(hud);
const banner = document.createElement("div"); banner.className = "bd-banner";
banner.innerHTML = '<div class="small"></div><div class="big"></div>'; stage.appendChild(banner);
const musicBtn = document.createElement("button"); musicBtn.className = "bd-music"; musicBtn.textContent = "🔊"; musicBtn.title = "Glasba";
stage.appendChild(musicBtn);
musicBtn.addEventListener("click", () => { musicBtn.textContent = Music.toggleMute() ? "🔊" : "🔇"; });

function updateHud() {
  hud.style.display = gameOn ? "flex" : "none";
  if (!gameOn) return;
  document.getElementById("hud-hp").textContent = "❤".repeat(Math.max(0, lives)) + "🖤".repeat(Math.max(0, diff.lives - lives));
  const lv = LEVELS[levelIdx];
  const wname = gun.name[LANG] + (ammo === Infinity ? "" : " (" + ammo + ")");
  const left = bossSpawned ? "👑" : minRemaining;
  document.getElementById("hud-info").textContent = lv.name[LANG] + " · " + T.enemies + ": " + left + " · 💧 " + wname;
}
function spawnedMinAlive() { return enemies.filter((e) => !e.transient && e.type !== "boss").length; }

function showBanner(small, big) {
  banner.querySelector(".small").textContent = small;
  banner.querySelector(".big").textContent = big;
  banner.classList.add("show");
  setTimeout(() => banner.classList.remove("show"), 1700);
}

function showScreen(html) { overlay.innerHTML = '<div class="bd-card">' + html + "</div>"; overlay.classList.add("show"); scheduleFit(); return overlay.querySelector(".bd-card"); }
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
   ZASLONI: naslovnica, zgodba, izbira hrčka + težavnosti
   =========================================================== */
function showIntro() {
  engine.paused = true; gameOn = false; updateHud();
  const card = showScreen('<div style="font-size:54px;line-height:1.1">🐹⚔️</div>' +
    '<div class="bd-h" style="font-size:30px">' + T.title + '</div><div class="bd-sub">' + T.tagline + "</div>");
  const b = document.createElement("button"); b.className = "bd-btn"; b.textContent = T.start;
  b.onclick = () => { SFX.click(); showStory(0); };
  card.appendChild(b);
}
function showStory(i) {
  if (i >= T.story.length) { showHamsterSelect(); return; }
  const card = showScreen('<div class="bd-sub">' + (i + 1) + " / " + T.story.length + '</div><div class="bd-msg">' + T.story[i] + "</div>");
  const b = document.createElement("button"); b.className = "bd-btn";
  b.textContent = (i === T.story.length - 1) ? T.start2 : T.next.replace(" ▶", "");
  b.onclick = () => { SFX.click(); showStory(i + 1); };
  card.appendChild(b);
}

/* vrteči predogled izbranega hrčka */
let preview = null;
function getPreview() {
  if (preview) return preview;
  const cv = document.createElement("canvas"); cv.className = "bd-prev"; cv.width = 240; cv.height = 188;
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); r.setSize(240, 188, false);
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xffffff, 0x445066, 1.05));
  const dl = new THREE.DirectionalLight(0xffffff, 0.7); dl.position.set(3, 6, 4); sc.add(dl);
  const cam = new THREE.PerspectiveCamera(40, 240 / 188, 0.1, 50); cam.position.set(0, 1.6, 4.4); cam.lookAt(0, 0.78, 0);
  const holder = new THREE.Group(); sc.add(holder);
  let raf = null;
  function loop() { holder.rotation.y += 0.02; r.render(sc, cam); raf = requestAnimationFrame(loop); }
  preview = {
    canvas: cv,
    setH(h) { while (holder.children.length) holder.remove(holder.children[0]); holder.add(makeHamster({ fur: h.fur, suit: h.suit, blade: h.blade, letter: h.letter })); },
    start() { if (!raf) loop(); }, stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } },
  };
  return preview;
}

function showHamsterSelect() {
  engine.paused = true; gameOn = false; updateHud();
  const card = showScreen('<div class="bd-h">' + T.pickH + '</div><div class="bd-sub">' + T.pickHSub +
    '</div><div class="bd-selrow"><div class="bd-list"></div>' +
    '<div class="bd-prevwrap"><div class="bd-prevname"></div></div></div>');
  const list = card.querySelector(".bd-list");
  const prevWrap = card.querySelector(".bd-prevwrap");
  const nameEl = card.querySelector(".bd-prevname");
  const prev = getPreview(); prevWrap.insertBefore(prev.canvas, nameEl); prev.start();
  let sel = chosenH || HAMSTERS[0];
  const buttons = [];
  function select(h) {
    sel = h; prev.setH(h);
    nameEl.textContent = h.name[LANG] + "  " + h.letter;
    buttons.forEach((b, i) => b.classList.toggle("on", HAMSTERS[i] === h));
  }
  HAMSTERS.forEach((h) => {
    const b = document.createElement("button"); b.className = "bd-opt";
    b.innerHTML = '<span class="bd-letter" style="background:' + h.suit + '">' + h.letter + '</span><span><div class="bd-name">' + h.name[LANG] + '</div><div class="bd-desc">' + h.perkTxt[LANG] + '</div></span>';
    b.onclick = () => { SFX.click(); select(h); };
    list.appendChild(b); buttons.push(b);
  });
  select(sel);
  const go = document.createElement("button"); go.className = "bd-btn"; go.textContent = T.next;
  go.onclick = () => { SFX.click(); chosenH = sel; prev.stop(); showDiffSelect(); };
  card.appendChild(go);
}

function showDiffSelect() {
  const card = showScreen('<div class="bd-h">' + T.pickDiff + '</div><div class="bd-diffs"></div>');
  const list = card.querySelector(".bd-diffs");
  DIFFS.forEach((d) => {
    const b = document.createElement("button"); b.className = "bd-diff";
    b.innerHTML = "<span>" + d.name[LANG] + "</span><span style='color:#e23b3b'>" + "❤".repeat(d.lives) + "</span>";
    b.onclick = () => { SFX.click(); diff = d; startGame(); };
    list.appendChild(b);
  });
}

/* ===========================================================
   ZAČETEK IGRE
   =========================================================== */
function buildPlayer() {
  if (player) engine.remove(player);
  player = makeHamster({ fur: chosenH.fur, suit: chosenH.suit, blade: chosenH.blade, letter: chosenH.letter });
  player.scale.setScalar(1.3);
  player.position.set(0, 0, 0);
  engine.add(player); engine.setPlayer(player);
}

function applyPerks() {
  saberMul = 1; gunCdMul = 1; engine.speed = 7.4;
  if (chosenH.perk === "saber") saberMul = 1.7;
  else if (chosenH.perk === "gun") gunCdMul = 0.62;
  else if (chosenH.perk === "speed") engine.speed = 8.7;
}

function clearArrays() {
  [enemies, pShots, eShots, pickups, fx].forEach((arr) => { arr.forEach((o) => engine.remove(o.group || o.mesh)); arr.length = 0; });
}

function startGame() {
  hideScreen();
  clearArrays();
  buildPlayer(); applyPerks();
  lives = diff.lives;
  gun = GUNS.basic; gunKey = "basic"; ammo = Infinity;
  fireCd = saberCd = invuln = saberAnim = 0;
  levelIdx = 0; gameOn = true; transitioning = false;
  engine.paused = false; engine.camTarget.set(0, 0, 0);
  musicBtn.style.display = "block"; Music.start();
  startLevel(0);
  updateHud();
}

function startLevel(i) {
  levelIdx = i;
  const lv = LEVELS[i];
  // ozadje + barve krova
  while (backdrop.children.length) backdrop.remove(backdrop.children[0]);
  deck.material.color.set(lv.deck); deckGrid.material.color.set(lv.grid);
  // planeti so pritrjeni na kamero (nebo): lokalne koord. = desno/gor/globina pogleda.
  // tako so vedno vidni v zgornjem delu okvirja, ne glede na premik igralca.
  const planet = makePlanet(rnd(7, 9), lv.planet, lv.pring);
  planet.position.set(rnd(-13, 13), rnd(7.5, 10), -62); backdrop.add(planet);
  const planet2 = makePlanet(rnd(3.5, 5), lv.planet, null);
  planet2.children[0].material.color.offsetHSL(0.06, 0, 0.06);
  planet2.position.set(rnd(16, 20) * (Math.random() < 0.5 ? -1 : 1), rnd(4.5, 8), -58); backdrop.add(planet2);
  // števci (število nasprotnikov se prilagodi izbrani težavnosti)
  levelMinions = Math.max(2, Math.round(lv.minions * diff.cnt));
  levelMaxAlive = Math.max(2, lv.maxAlive + diff.aliveAdj);
  spawnedMin = 0; minRemaining = levelMinions; rocketsLeft = Math.round(lv.rockets * diff.rocketMul);
  bossSpawned = false; bossDead = false;
  spawnTimer = 0; rocketTimer = rnd(2, 4); introTimer = 1.6; heartTimer = rnd(9, 14); transitioning = false;
  Music.setMood("battle");
  SFX.level();
  showBanner((i === LEVELS.length - 1 ? T.final + " · " : "") + (i + 1) + "/" + LEVELS.length, lv.name[LANG]);
  updateHud();
}

/* ===========================================================
   NASPROTNIKI
   =========================================================== */
function edgeSpawnPos() { const a = rnd(0, TAU), d = ARENA_R - 1.5; return { x: Math.cos(a) * d, z: Math.sin(a) * d }; }

function spawnMinion() {
  const lv = LEVELS[levelIdx];
  const r = Math.random(); let type = "robot", acc = 0;
  for (const k of ["robot", "hamster", "probe"]) { acc += lv.w[k] || 0; if (r <= acc) { type = k; break; } }
  const p = edgeSpawnPos();
  let group, hp, rad, spd;
  if (type === "robot") { group = makeRobot(); hp = 3; rad = 0.7; spd = 2.6; }
  else if (type === "hamster") { group = makeHamster({ fur: "#b8a98f", suit: "#b03030", blade: "#ff5a3c" }); group.scale.setScalar(1.15); hp = 2; rad = 0.6; spd = 4.6; }
  else { group = makeProbe(); hp = 1; rad = 0.5; spd = 2.2; }
  group.position.set(p.x, type === "probe" ? 1.0 : 0, p.z);
  engine.add(group);
  enemies.push({ type, group, hp, r: rad, spd: spd * lv.spd * diff.spd, shootCd: rnd(0.8, 1.8) });
  spawnedMin++;
}

function spawnRocket() {
  const p = edgeSpawnPos();
  const g = makeRocket(); g.position.set(p.x, 1.0, p.z); engine.add(g);
  const tx = player.position.x + rnd(-1.5, 1.5), tz = player.position.z + rnd(-1.5, 1.5);
  const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz) || 1;
  const spd = 11 * diff.spd;
  enemies.push({ type: "rocket", group: g, hp: 1, r: 0.45, transient: true, vx: dx / d * spd, vz: dz / d * spd, life: 6 });
  g.rotation.y = Math.atan2(dx, dz);
}

function spawnBoss() {
  const g = makeRobot({ metal: "#c0566a" }); g.scale.setScalar(3.0);
  // postavi pred igralca (proti sredini arene), da je TAKOJ viden na zaslonu
  const px = player.position.x, pz = player.position.z;
  let dx = -px, dz = -pz; const dl = Math.hypot(dx, dz);
  if (dl < 0.5) { dx = 0; dz = -1; } else { dx /= dl; dz /= dl; }
  let bx = px + dx * 8, bz = pz + dz * 8;
  const rr = Math.hypot(bx, bz); if (rr > ARENA_R - 3) { const k = (ARENA_R - 3) / rr; bx *= k; bz *= k; }
  g.position.set(bx, 0, bz); g.rotation.y = Math.atan2(px - bx, pz - bz);
  engine.add(g);
  const spd = 2.4 * LEVELS[levelIdx].spd * diff.spd;
  enemies.push({ type: "boss", group: g, hp: Math.round(34 * diff.bossMul), r: 1.9, spd, shootCd: 1.2, summonCd: 5, t: 0 });
  bossSpawned = true;
  showBanner("👑", T.boss);
  updateHud();
}

function enemyShoot(from, tx, tz, spd, color, dmg) {
  const dx = tx - from.x, dz = tz - from.z, d = Math.hypot(dx, dz) || 1;
  const m = glow(new THREE.SphereGeometry(0.16, 8, 8), color || "#ff7b3c");
  m.position.set(from.x, 0.8, from.z); engine.add(m);
  eShots.push({ mesh: m, vx: dx / d * spd, vz: dz / d * spd, life: 4, dmg: dmg || 1 });
  SFX.enemyShoot();
}

/* ===========================================================
   IGRALČEV BOJ
   =========================================================== */
function facingVec() { const f = engine.facing || 0; return { x: Math.sin(f), z: Math.cos(f) }; }
/* rahli auto-aim: če je v stožcu (~±55°) okoli smeri gledanja nasprotnik, nameri vanj */
const AIM_CONE = 0.57, AIM_RANGE = 18;   // cos(55°)
function aimVec() {
  const f = facingVec(), p = player.position;
  let best = null, bestD = 1e9;
  for (const e of enemies) {
    if (e.type === "rocket") continue;
    const dx = e.group.position.x - p.x, dz = e.group.position.z - p.z, d = Math.hypot(dx, dz) || 1;
    if (d > AIM_RANGE) continue;
    const dot = (dx / d) * f.x + (dz / d) * f.z;     // poravnanost s smerjo gledanja
    if (dot >= AIM_CONE && d < bestD) { bestD = d; best = { x: dx / d, z: dz / d }; }
  }
  return best || f;
}

function makePShot(dirx, dirz, g) {
  const m = glow(new THREE.SphereGeometry(g.big ? 0.26 : 0.15, 8, 8), g.color);
  const p = player.position;
  m.position.set(p.x + dirx * 0.6, 0.8, p.z + dirz * 0.6); engine.add(m);
  pShots.push({ mesh: m, vx: dirx * g.speed, vz: dirz * g.speed, life: 1.4, dmg: g.dmg, big: g.big });
}
function shoot() {
  if (!gameOn || engine.paused || fireCd > 0) return;
  const f = aimVec();
  player.rotation.y = Math.atan2(f.x, f.z);   // obrni hrčka proti cilju
  if (gun.spread) {
    for (const a of [-gun.spread, 0, gun.spread]) {
      const ca = Math.cos(a), sa = Math.sin(a);
      makePShot(f.x * ca - f.z * sa, f.x * sa + f.z * ca, gun);
    }
  } else makePShot(f.x, f.z, gun);
  gun.big ? SFX.shootBig() : SFX.shoot();
  fireCd = gun.cd * (gunKey === "basic" ? gunCdMul : 1);
  if (ammo !== Infinity) { ammo--; if (ammo <= 0) { gun = GUNS.basic; gunKey = "basic"; ammo = Infinity; } updateHud(); }
}
function swingSaber() {
  if (!gameOn || engine.paused || saberCd > 0) return;
  saberCd = 0.42; saberAnim = 0.28; SFX.saber();
  const reach = 2.7, f = facingVec(), p = player.position;
  const dmg = 4 * saberMul;
  // nasprotniki v dosegu (sprednji lok)
  for (const e of enemies) {
    const dx = e.group.position.x - p.x, dz = e.group.position.z - p.z, d = Math.hypot(dx, dz);
    if (d < reach + e.r) {
      const dot = (dx / (d || 1)) * f.x + (dz / (d || 1)) * f.z;
      if (dot > 0 || d < e.r + 0.8) { e.hp -= dmg; SFX.hitEnemy(); if (e.hp <= 0) killEnemy(e); }
    }
  }
  // odbij sovražne izstrelke in rakete v dosegu (POK!)
  for (const s of eShots) { if (Math.hypot(s.mesh.position.x - p.x, s.mesh.position.z - p.z) < reach) { s.dead = true; spawnPok(s.mesh.position); } }
}

function spawnPok(pos) {
  const ring = glow(new THREE.TorusGeometry(0.2, 0.06, 8, 18), "#ffffff"); ring.rotation.x = -Math.PI / 2;
  ring.position.set(pos.x, 0.6, pos.z); engine.add(ring);
  fx.push({ group: ring, life: 0.3, grow: 9 }); SFX.pok();
}
function spawnBoom(pos, big) {
  const ring = glow(new THREE.TorusGeometry(0.3, 0.1, 8, 20), big ? "#ff7b3c" : "#ffd23b"); ring.rotation.x = -Math.PI / 2;
  ring.position.set(pos.x, 0.5, pos.z); engine.add(ring);
  fx.push({ group: ring, life: 0.45, grow: big ? 16 : 10 }); SFX.boom();
}

function killEnemy(e) {
  const i = enemies.indexOf(e); if (i < 0) return;
  enemies.splice(i, 1); engine.remove(e.group);
  spawnBoom(e.group.position, e.type === "boss");
  if (e.type === "boss") { bossDead = true; updateHud(); return; }
  if (!e.transient) {
    minRemaining = Math.max(0, minRemaining - 1);
    // robot včasih spusti puško
    if (e.type === "robot" && Math.random() < 0.55) dropGun(e.group.position);
    // občasno spusti srček za zdravljenje (le če igralcu manjka življenj)
    else if (lives < diff.lives && Math.random() < 0.22) dropHeart(e.group.position);
    updateHud();
  }
}
function dropGun(pos) {
  const key = DROPS[Math.floor(Math.random() * DROPS.length)];
  const g = GUNS[key];
  const wrap = makeGunPickup(g.color); wrap.position.set(pos.x, 0.7, pos.z); engine.add(wrap);
  pickups.push({ group: wrap, kind: "gun", key, life: 12 });
}
function dropHeart(pos) {
  const wrap = makeHeart(); wrap.position.set(pos.x, 0.75, pos.z); engine.add(wrap);
  pickups.push({ group: wrap, kind: "heart", life: 14 });
}
function spawnHeart() {
  const a = rnd(0, TAU), d = rnd(4, ARENA_R - 5);
  dropHeart({ x: Math.cos(a) * d, z: Math.sin(a) * d });
}
function hurtPlayer(dmg) {
  if (invuln > 0) return;
  lives -= dmg; invuln = 1.1; SFX.hurt(); updateHud();
  if (lives <= 0) gameOver();
}

/* ===========================================================
   ZAKLJUČEK
   =========================================================== */
/* ponovna igra brez osveževanja strani (ohrani celozaslonski način) */
function playAgain() { SFX.click(); clearArrays(); hideScreen(); showHamsterSelect(); }
function gameOver() {
  gameOn = false; engine.paused = true; updateHud(); SFX.over();
  const card = showScreen('<div class="bd-h">' + T.over + '</div><div class="bd-sub">' + T.overSub + "</div>");
  const b = document.createElement("button"); b.className = "bd-btn"; b.textContent = T.again;
  b.onclick = playAgain; card.appendChild(b);
}
function win() {
  gameOn = false; engine.paused = true; updateHud(); SFX.win();
  const card = showScreen('<div style="font-size:48px">🏆🐹</div><div class="bd-h">' + T.win + '</div><div class="bd-sub">' + T.winSub + "</div>");
  const b = document.createElement("button"); b.className = "bd-btn"; b.textContent = T.again;
  b.onclick = playAgain; card.appendChild(b);
}
function levelCleared() {
  if (transitioning) return; transitioning = true;
  if (levelIdx >= LEVELS.length - 1) { win(); return; }
  SFX.level();
  const card = showScreen('<div class="bd-h">' + T.levelClear + ' 🎉</div><div class="bd-sub">' + LEVELS[levelIdx].name[LANG] + " ✔</div>");
  const b = document.createElement("button"); b.className = "bd-btn"; b.textContent = T.next;
  b.onclick = () => { SFX.click(); engine.paused = false; hideScreen(); startLevel(levelIdx + 1); };
  card.appendChild(b);
  engine.paused = true;
}

/* ===========================================================
   GLAVNA ZANKA (fiksni korak 60 Hz)
   =========================================================== */
engine.onStep = (dt) => {
  // okrasne animacije (vedno)
  edgeRing.rotation.z += 0.004;
  // ozadje (planeti) pritrjeno na kamero = stalno nebo v zgornjem delu okvirja
  backdrop.position.copy(engine.camera.position);
  backdrop.quaternion.copy(engine.camera.quaternion);
  backdrop.children.forEach((p, i) => { p.rotation.y += 0.0015 + i * 0.0008; });
  pickups.forEach((pk) => { pk.group.rotation.y += 0.04; if (pk.group.userData.halo) pk.group.userData.halo.rotation.z += 0.05; });
  // animacija zamaha meča
  if (player && player.userData.saber) {
    const sab = player.userData.saber;
    if (saberAnim > 0) { saberAnim -= dt; sab.rotation.x = -1.4 * Math.sin((0.28 - Math.max(0, saberAnim)) / 0.28 * Math.PI); }
    else sab.rotation.x = 0;
  }
  if (!gameOn || engine.paused) return;

  const p = player.position;
  if (fireCd > 0) fireCd -= dt;
  if (saberCd > 0) saberCd -= dt;
  if (invuln > 0) { invuln -= dt; player.visible = (Math.floor(invuln * 12) % 2 === 0); } else player.visible = true;

  // tipkovnica: streljanje (preslednica) + vodik (M)
  if (engine.keys[" "]) shoot();
  if (engine.keys["m"]) swingSaber();

  // spawnanje
  if (introTimer > 0) introTimer -= dt;
  else {
    const lv = LEVELS[levelIdx];
    spawnTimer -= dt;
    if (spawnTimer <= 0 && spawnedMin < levelMinions && spawnedMinAlive() < levelMaxAlive) { spawnMinion(); spawnTimer = lv.spawn; }
    if (rocketsLeft > 0) { rocketTimer -= dt; if (rocketTimer <= 0) { spawnRocket(); rocketsLeft--; rocketTimer = rnd(2.2, 4.2); } }
    // občasni srček na areni (le če igralcu manjka življenj)
    heartTimer -= dt;
    if (heartTimer <= 0) { if (lives < diff.lives) spawnHeart(); heartTimer = rnd(12, 18); }
    // boss se pojavi, ko so vsi minioni spawnani in pobiti
    if (lv.boss && !bossSpawned && spawnedMin >= levelMinions && spawnedMinAlive() === 0) spawnBoss();
  }

  // izstrelki igralca
  for (const s of pShots) {
    s.mesh.position.x += s.vx * dt; s.mesh.position.z += s.vz * dt; s.life -= dt;
    if (s.life <= 0 || Math.hypot(s.mesh.position.x, s.mesh.position.z) > ARENA_R + 2) { s.dead = true; continue; }
    for (const e of enemies) {
      if (Math.hypot(s.mesh.position.x - e.group.position.x, s.mesh.position.z - e.group.position.z) < e.r + (s.big ? 0.4 : 0.25)) {
        e.hp -= s.dmg; SFX.hitEnemy(); s.dead = true;
        if (e.type === "rocket") { spawnPok(s.mesh.position); }
        if (e.hp <= 0) killEnemy(e);
        break;
      }
    }
  }
  prune(pShots);

  // sovražni izstrelki
  for (const s of eShots) {
    s.mesh.position.x += s.vx * dt; s.mesh.position.z += s.vz * dt; s.life -= dt;
    if (s.life <= 0 || Math.hypot(s.mesh.position.x, s.mesh.position.z) > ARENA_R + 2) { s.dead = true; continue; }
    if (Math.hypot(s.mesh.position.x - p.x, s.mesh.position.z - p.z) < 0.7) { hurtPlayer(s.dmg); s.dead = true; }
  }
  prune(eShots);

  // nasprotniki
  for (const e of enemies) {
    const ep = e.group.position;
    const dx = p.x - ep.x, dz = p.z - ep.z, dist = Math.hypot(dx, dz) || 1;
    if (e.type === "rocket") {
      ep.x += e.vx * dt; ep.z += e.vz * dt; e.life -= dt;
      if (e.life <= 0 || Math.hypot(ep.x, ep.z) > ARENA_R + 3) { e.dead = true; continue; }
      if (dist < e.r + 0.6) { hurtPlayer(1); spawnBoom(ep, false); e.dead = true; }
      continue;
    }
    if (e.type === "robot" || e.type === "boss") {
      const keep = e.type === "boss" ? 7 : 7.5;
      if (dist > keep + 0.5) { ep.x += (dx / dist) * e.spd * dt; ep.z += (dz / dist) * e.spd * dt; }
      else if (dist < keep - 0.5) { ep.x -= (dx / dist) * e.spd * dt; ep.z -= (dz / dist) * e.spd * dt; }
      e.group.rotation.y = Math.atan2(dx, dz);
      e.shootCd -= dt;
      if (e.shootCd <= 0) {
        if (e.type === "boss") {
          for (const a of [-0.3, 0, 0.3]) { const ca = Math.cos(a), sa = Math.sin(a); enemyShoot(ep, p.x + (dx * ca - dz * sa), p.z + (dx * sa + dz * ca), 13, "#ff5a3c", 1); }
          e.shootCd = 1.4 / diff.spd;
          e.summonCd -= 0; e.t = (e.t || 0);
        } else { enemyShoot(ep, p.x, p.z, 12 * diff.spd, "#49d6ff", 1); e.shootCd = rnd(1.4, 2.4) / LEVELS[levelIdx].atk / diff.atk; }
      }
      if (e.type === "boss") {
        e.summonCd -= dt;
        if (e.summonCd <= 0 && spawnedMinAlive() < levelMaxAlive) { spawnMinion(); minRemaining++; e.summonCd = 5; }
      }
      // kontaktna škoda (robot/boss)
      if (dist < e.r + 0.55) hurtPlayer(1);
    } else if (e.type === "hamster") {
      ep.x += (dx / dist) * e.spd * dt; ep.z += (dz / dist) * e.spd * dt;
      e.group.rotation.y = Math.atan2(dx, dz);
      if (dist < e.r + 0.6) hurtPlayer(1);
    } else if (e.type === "probe") {
      ep.x += (dx / dist) * e.spd * dt; ep.z += (dz / dist) * e.spd * dt;
      ep.y = 1.0 + Math.sin(performance.now() * 0.006) * 0.15;
      if (e.group.userData.ring) e.group.userData.ring.rotation.z += 0.1;
      if (dist < e.r + 0.55) { hurtPlayer(1); spawnBoom(ep, false); e.dead = true; }
    }
  }
  prune(enemies);

  // pobiranje pušk
  for (const pk of pickups) {
    pk.life -= dt;
    if (pk.life <= 0) { pk.dead = true; continue; }
    if (Math.hypot(pk.group.position.x - p.x, pk.group.position.z - p.z) < 1.3) {
      if (pk.kind === "heart") {
        if (lives < diff.lives) lives++;
        SFX.heal();
      } else {
        gun = GUNS[pk.key]; gunKey = pk.key; ammo = gun.ammo; SFX.pickup();
      }
      pk.dead = true; updateHud();
    }
  }
  prune(pickups);

  // učinki
  for (const f of fx) { f.life -= dt; const s = 1 + (0.45 - f.life) * f.grow; f.group.scale.set(s, s, s); f.group.material.opacity = Math.max(0, f.life * 2.2); f.group.material.transparent = true; if (f.life <= 0) f.dead = true; }
  prune(fx);

  // konec nivoja: vsi minioni pobiti (in boss, če obstaja)
  if (introTimer <= 0 && !transitioning) {
    const lv = LEVELS[levelIdx];
    const cleared = spawnedMin >= levelMinions && spawnedMinAlive() === 0 && (!lv.boss || bossDead);
    if (cleared) levelCleared();
  }
};
function prune(arr) { for (let i = arr.length - 1; i >= 0; i--) if (arr[i].dead) { engine.remove(arr[i].group || arr[i].mesh); arr.splice(i, 1); } }

engine.start();
showIntro();

/* ===========================================================
   MOBILNE KONTROLE: joystick = premik, gumba = streljanje + vodik
   =========================================================== */
if (window.azvRegisterControls) {
  window.azvRegisterControls({
    primary: () => shoot(),
    secondary: () => swingSaber(),
    primaryLabel: "💧",
    secondaryLabel: "⚔️",
    axis: "both",
  });
}

/* ob preklopu celozaslonskega zanesljivo osveži velikost platna */
(function () {
  const ping = () => [80, 350, 700].forEach((d) => setTimeout(() => window.dispatchEvent(new Event("resize")), d));
  document.querySelectorAll(".fs-enter, .fs-exit").forEach((b) => b.addEventListener("click", ping));
})();
