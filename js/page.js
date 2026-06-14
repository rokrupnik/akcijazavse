/* ===========================================================
   SKUPNA GLAVA ZA STRAN Z IGRO (jezik + donacije)
   Ob menjavi jezika stran osvežimo, da se prevede tudi
   besedilo, narisano na platnu igre.
   =========================================================== */
(function () {
  const L = () => window.AZV.lang;

  const langBtn = document.getElementById("lang-btn");
  if (langBtn) {
    langBtn.textContent = L() === "sl" ? "EN" : "SL";
    langBtn.addEventListener("click", () => {
      window.AZV.setLang(L() === "sl" ? "en" : "sl");
      location.reload();
    });
  }

  const modal = document.getElementById("donate-modal");
  if (modal) {
    document.querySelectorAll("[data-open-donate]").forEach((b) =>
      b.addEventListener("click", () => { modal.classList.add("open"); renderDonate(); })
    );
    modal.addEventListener("click", (e) => {
      if (e.target === modal || e.target.hasAttribute("data-close-donate")) modal.classList.remove("open");
    });
  }

  function renderDonate() {
    const links = document.getElementById("donate-links");
    links.innerHTML = "";
    const d = SITE.donate;
    [
      { url: d.stripe, label: "💳 Stripe" },
      { url: d.paypal, label: "🅿️ PayPal" },
      { url: d.kofi,   label: "☕ Ko-fi" },
      { url: d.bmac,   label: "☕ Buy Me a Coffee" },
    ].forEach((o) => {
      if (!o.url) return;
      const a = document.createElement("a");
      a.className = "donate-link";
      a.href = o.url; a.target = "_blank"; a.rel = "noopener";
      a.textContent = o.label;
      links.appendChild(a);
    });
    if (d.flik) {
      const f = document.createElement("div");
      f.className = "donate-flik";
      f.textContent = "🟢 Flik: " + d.flik;
      links.appendChild(f);
    }
    document.getElementById("donate-bank").textContent = d.bank[L()] || d.bank.sl;
    const qrBox = document.getElementById("donate-qr");
    if (qrBox && d.qr) {
      const base = location.pathname.includes("/games/") ? "../" : "";
      qrBox.innerHTML = '<img class="donate-qr" src="' + base + d.qr + '" alt="UPN QR" />';
    }
  }

  /* ---------- igralni gumbi (mobilni) + celozaslonsko ---------- */
  const stage = document.getElementById("stage");
  if (stage) {
    // akcijska gumba v kotu canvasa (CSS jih pokaže le na dotik napravah)
    const controls = document.createElement("div");
    controls.className = "game-controls";
    const btnSecondary = document.createElement("button");
    btnSecondary.className = "game-btn secondary"; btnSecondary.type = "button";
    const btnPrimary = document.createElement("button");
    btnPrimary.className = "game-btn primary"; btnPrimary.type = "button";
    controls.appendChild(btnSecondary);
    controls.appendChild(btnPrimary);
    stage.appendChild(controls);

    // joystick za premik (spodaj levo) — CSS ga pokaže le na dotik napravah
    const joyBase = document.createElement("div");
    joyBase.className = "joystick";
    joyBase.innerHTML =
      '<span class="joy-arrow up">▲</span><span class="joy-arrow down">▼</span>' +
      '<span class="joy-arrow left">◀</span><span class="joy-arrow right">▶</span>' +
      '<div class="joystick-knob"></div>';
    stage.appendChild(joyBase);
    const knob = joyBase.querySelector(".joystick-knob");
    const joy = { x: 0, y: 0, active: false };
    window.azvJoystick = joy;
    let joyAxis = "both";
    const JOY_R = 38;
    function joySet(dx, dy) { knob.style.transform = "translate(" + dx + "px," + dy + "px)"; }
    function joyMove(e) {
      const r = joyBase.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      if (joyAxis === "vertical") dx = 0;
      const dist = Math.hypot(dx, dy) || 1;
      const cl = Math.min(dist, JOY_R);
      const nx = dx / dist * cl, ny = dy / dist * cl;
      joySet(nx, ny);
      joy.x = joyAxis === "vertical" ? 0 : nx / JOY_R;
      joy.y = ny / JOY_R;
    }
    function joyEnd() { joy.active = false; joy.x = 0; joy.y = 0; joySet(0, 0); }
    joyBase.addEventListener("pointerdown", (e) => { e.preventDefault(); joy.active = true; try { joyBase.setPointerCapture(e.pointerId); } catch (x) {} joyMove(e); });
    joyBase.addEventListener("pointermove", (e) => { if (joy.active) joyMove(e); });
    ["pointerup", "pointercancel"].forEach((ev) => joyBase.addEventListener(ev, joyEnd));

    // izhod iz celozaslonskega (zgoraj desno)
    const exitBtn = document.createElement("button");
    exitBtn.className = "fs-exit"; exitBtn.type = "button"; exitBtn.textContent = "✕";
    exitBtn.setAttribute("aria-label", "exit");
    stage.appendChild(exitBtn);

    // gumb celozaslonsko (pod canvasom)
    const fsBtn = document.createElement("button");
    fsBtn.className = "fs-enter ghost-btn"; fsBtn.type = "button";
    fsBtn.textContent = (L() === "en" ? "⛶ Full screen" : "⛶ Celozaslonsko");
    stage.insertAdjacentElement("afterend", fsBtn);

    // igra registrira svoji akciji
    let prim = null, sec = null;
    window.azvRegisterControls = function (c) {
      prim = c.primary; sec = c.secondary;
      if (c.primaryLabel) btnPrimary.textContent = c.primaryLabel;
      if (c.secondaryLabel) btnSecondary.textContent = c.secondaryLabel;
      joyAxis = c.axis || "both";
      if (joyAxis === "vertical") joyBase.classList.add("vertical");
    };

    // primarni gumb: drži za samodejno streljanje
    let fireTimer = null;
    btnPrimary.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (prim) prim();
      clearInterval(fireTimer);
      fireTimer = setInterval(() => { if (prim) prim(); }, 110);
    });
    const stopFire = () => { clearInterval(fireTimer); fireTimer = null; };
    ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => btnPrimary.addEventListener(ev, stopFire));
    // sekundarni gumb: en pritisk
    btnSecondary.addEventListener("pointerdown", (e) => { e.preventDefault(); if (sec) sec(); });

    // --- celozaslonsko ---
    function lockLandscape() {
      document.body.classList.add("azv-fs");
      try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(() => {}); } catch (e) {}
    }
    function enterFS() {
      const req = stage.requestFullscreen || stage.webkitRequestFullscreen;
      if (req) {
        Promise.resolve(req.call(stage)).then(lockLandscape).catch(lockLandscape);
      } else {
        document.body.classList.add("azv-pseudofs", "azv-fs");  // npr. iPhone
      }
    }
    function exitFS() {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      }
      document.body.classList.remove("azv-pseudofs", "azv-fs");
      try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {}
    }
    fsBtn.addEventListener("click", enterFS);
    exitBtn.addEventListener("click", exitFS);
    ["fullscreenchange", "webkitfullscreenchange"].forEach((ev) =>
      document.addEventListener(ev, () => {
        const fs = document.fullscreenElement || document.webkitFullscreenElement;
        if (!fs) document.body.classList.remove("azv-fs");
        else document.body.classList.add("azv-fs");
      })
    );
  }
})();
