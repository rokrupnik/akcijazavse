/* ===========================================================
   ISO-ENGINE  — večkratno uporaben 3D pogon (three.js)
   Diagonalni (Minecraft Dungeons) pogled s fiksno kamero, ki
   sledi igralcu; gradniki sveta iz kock; premik figurice s
   tipkami ali mobilnim joystickom; fiksni časovni korak 60 Hz.

   Namenjen ponovni uporabi v več igrah — vsebina (modeli, svet,
   pravila) se poda od zunaj.
   =========================================================== */
import * as THREE from "three";

export class IsoEngine {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.viewSize = opts.viewSize || 13;   // "zoom" ortografske kamere (manjše = bližje)
    this.solid = opts.solid || (() => false);  // funkcija (x,z) -> true, če je tam ovira
    this.onStep = opts.onStep || (() => {});    // logika igre na vsak fiksni korak
    this.paused = false;

    // scena
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(opts.bg || "#0e1322");
    this.scene.fog = new THREE.Fog(opts.bg || "#0e1322", 28, 60);

    // ortografska kamera: nad in za igralcem, nagnjena navzdol (gleda proti -Z).
    // Tako je "gor" na zaslonu = -Z, "desno" = +X → tipke se ujemajo z zaslonom.
    this.camOffset = opts.camOffset || new THREE.Vector3(0, 17, 13);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    this.camTarget = new THREE.Vector3();

    // renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // luči
    const amb = new THREE.HemisphereLight(0xffffff, 0x404a5a, 0.85);
    this.scene.add(amb);
    const sun = new THREE.DirectionalLight(0xfff2d8, 1.0);
    sun.position.set(20, 30, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const s = 30;
    sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
    sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 90;
    this.sun = sun;
    this.scene.add(sun);
    this.scene.add(sun.target);

    // igralec
    this.player = null;
    this.speed = opts.speed || 6.2;       // enot/s
    this.radius = opts.radius || 0.42;
    this.facing = 0;

    // kontrole, poravnane z zaslonom: "gor" = -Z (v globino zaslona), "desno" = +X
    this.fwd = (opts.fwd || new THREE.Vector3(0, 0, -1)).clone().normalize();
    this.right = (opts.right || new THREE.Vector3(1, 0, 0)).clone().normalize();

    this.keys = {};
    this._bindInput();
    this._resize();
    window.addEventListener("resize", () => this._resize());

    this._last = 0; this._acc = 0;
    this.STEP = 1000 / 60;
  }

  /* ---- javni API ---- */
  add(obj) { this.scene.add(obj); return obj; }
  remove(obj) { this.scene.remove(obj); }
  setPlayer(obj) { this.player = obj; this.camTarget.copy(obj.position); this._snapCamera(); }

  start() {
    const loop = (now) => {
      if (!this._last) this._last = now;
      this._acc += now - this._last; this._last = now;
      if (this._acc > 250) this._acc = 250;
      let steps = 0;
      while (this._acc >= this.STEP && steps < 5) { this._update(this.STEP / 1000); this._acc -= this.STEP; steps++; }
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ---- vnos ---- */
  _bindInput() {
    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      this.keys[k] = true;
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
    });
    window.addEventListener("keyup", (e) => { this.keys[e.key.toLowerCase()] = false; });
  }
  inputVector() {
    let ix = 0, iz = 0;
    if (this.keys["arrowup"] || this.keys["w"]) iz += 1;
    if (this.keys["arrowdown"] || this.keys["s"]) iz -= 1;
    if (this.keys["arrowleft"] || this.keys["a"]) ix -= 1;
    if (this.keys["arrowright"] || this.keys["d"]) ix += 1;
    const joy = window.azvJoystick;
    if (joy && joy.active && (joy.x || joy.y)) { ix += joy.x; iz += -joy.y; }
    return { ix, iz };
  }

  /* ---- posodobitev ---- */
  _update(dt) {
    this.onStep(dt);
    if (this.paused || !this.player) { this._followCamera(); return; }
    const { ix, iz } = this.inputVector();
    if (ix || iz) {
      // gibanje, poravnano z izo-pogledom
      const mx = this.right.x * ix + this.fwd.x * iz;
      const mz = this.right.z * ix + this.fwd.z * iz;
      const len = Math.hypot(mx, mz) || 1;
      const dx = (mx / len) * this.speed * dt;
      const dz = (mz / len) * this.speed * dt;
      this._tryMove(dx, dz);
      this.facing = Math.atan2(mx, mz);
      this.player.rotation.y = this.facing;
      // rahel "korak" gor-dol
      this.player.position.y = Math.abs(Math.sin(performance.now() * 0.012)) * 0.06;
    } else {
      this.player.position.y = 0;
    }
    this._followCamera();
  }
  _tryMove(dx, dz) {
    const p = this.player.position, r = this.radius;
    const nx = p.x + dx;
    if (!this.solid(nx + Math.sign(dx) * r, p.z)) p.x = nx;
    const nz = p.z + dz;
    if (!this.solid(p.x, nz + Math.sign(dz) * r)) p.z = nz;
  }
  _followCamera() {
    if (!this.player) return;
    // mehko sledenje
    this.camTarget.lerp(this.player.position, 0.12);
    this.camera.position.copy(this.camTarget).add(this.camOffset);
    this.camera.lookAt(this.camTarget);
    this.sun.target.position.copy(this.camTarget);
  }
  _snapCamera() {
    this.camera.position.copy(this.camTarget).add(this.camOffset);
    this.camera.lookAt(this.camTarget);
  }

  _resize() {
    const w = this.canvas.clientWidth || this.canvas.width;
    const h = this.canvas.clientHeight || this.canvas.height;
    const aspect = w / h;
    const v = this.viewSize;
    this.camera.left = -v * aspect; this.camera.right = v * aspect;
    this.camera.top = v; this.camera.bottom = -v;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
  }
}

/* ---------- gradniki sveta (kocke) ---------- */
export function box(w, h, d, color, opts = {}) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshLambertMaterial({ color });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = opts.cast !== false;
  m.receiveShadow = opts.receive !== false;
  return m;
}
export { THREE };
