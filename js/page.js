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
      const label = L() === "en" ? "Or scan in your bank app:" : "Ali skeniraj v aplikaciji banke:";
      qrBox.innerHTML = '<p class="qr-label">' + label + '</p><img class="donate-qr" src="' + base + d.qr + '" alt="UPN QR" />';
    }
  }
})();
