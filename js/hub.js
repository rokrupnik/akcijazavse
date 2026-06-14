/* ===========================================================
   DOMAČA STRAN: ekipa + izbira zgodb + donacije + jezik
   =========================================================== */
(function () {
  const L = () => window.AZV.lang;
  const T = (k) => window.AZV.t(k);

  /* ---- gumb za jezik ---- */
  const langBtn = document.getElementById("lang-btn");
  function refreshLangBtn() { langBtn.textContent = L() === "sl" ? "EN" : "SL"; }
  langBtn.addEventListener("click", () => window.AZV.toggle());

  /* ---- ekipa (avtorji) ---- */
  function renderTeam() {
    const box = document.getElementById("team");
    box.innerHTML = "";
    Object.values(SITE.authors).forEach((a) => {
      const card = document.createElement("div");
      card.className = "member";
      const initial = (a.name || "?").charAt(0).toUpperCase();
      card.innerHTML =
        `<div class="member-photo">` +
        `<span class="member-initial">${initial}</span>` +
        (a.photo ? `<img alt="">` : "") +
        `</div>` +
        `<div class="member-name"></div>` +
        `<div class="member-bio"></div>`;
      card.querySelector(".member-name").textContent = a.name;
      card.querySelector(".member-bio").textContent = a.bio[L()] || a.bio.sl;
      const img = card.querySelector("img");
      if (img) {
        img.onerror = () => img.remove();   // če slike ni, ostane začetnica
        img.src = a.photo;
      }
      box.appendChild(card);
    });
  }

  /* ---- zgodbe ---- */
  function renderStories() {
    const box = document.getElementById("stories");
    box.innerHTML = "";
    // obrnjen vrstni red: nazadnje dodane zgodbe se pokažejo prve
    [...SITE.stories].reverse().forEach((s) => {
      const card = document.createElement("div");
      card.className = "story-card";
      const author = SITE.authors[s.author];
      const authorName = author ? author.name : "";
      // oznake (igra / strip) glede na to, kaj zgodba ima
      const badges = [];
      if (s.game) badges.push(T("type_game"));
      if (s.comic) badges.push(T("type_strip"));
      // gumbi
      let btns = "";
      if (s.game) btns += `<a class="story-btn play" href="${s.game}">${T("play_btn")}</a>`;
      if (s.comic) btns += `<a class="story-btn read" href="strip.html?story=${s.comic}">${T("read_btn")}</a>`;
      card.innerHTML =
        `<div class="story-cover" style="background-image:url('${s.cover}')">` +
        `<div class="story-badges">` +
        badges.map((b) => `<span class="story-badge">${b}</span>`).join("") +
        `</div></div>` +
        `<div class="story-body">` +
        `<h3 class="story-title"></h3>` +
        `<div class="story-author">${T("by_author")} <b></b></div>` +
        `<p class="story-blurb"></p>` +
        `<div class="story-actions">${btns}</div>` +
        `</div>`;
      card.querySelector(".story-title").textContent = s.title[L()] || s.title.sl;
      card.querySelector(".story-author b").textContent = authorName;
      card.querySelector(".story-blurb").textContent = s.blurb[L()] || s.blurb.sl;
      box.appendChild(card);
    });
    // "kmalu novo" namig
    const soon = document.createElement("div");
    soon.className = "story-card soon";
    soon.innerHTML = `<div class="soon-inner">✨<span></span></div>`;
    soon.querySelector("span").textContent = T("coming_soon");
    box.appendChild(soon);
  }

  /* ---- donacije ---- */
  const modal = document.getElementById("donate-modal");
  function openDonate() { modal.classList.add("open"); renderDonate(); }
  function closeDonate() { modal.classList.remove("open"); }
  document.querySelectorAll("[data-open-donate]").forEach((b) =>
    b.addEventListener("click", openDonate)
  );
  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.hasAttribute("data-close-donate")) closeDonate();
  });

  function renderDonate() {
    const links = document.getElementById("donate-links");
    links.innerHTML = "";
    const d = SITE.donate;
    const opts = [
      { url: d.stripe, label: "💳 Stripe" },
      { url: d.paypal, label: "🅿️ PayPal" },
      { url: d.kofi,   label: "☕ Ko-fi" },
      { url: d.bmac,   label: "☕ Buy Me a Coffee" },
    ];
    opts.forEach((o) => {
      if (!o.url) return;
      const a = document.createElement("a");
      a.className = "donate-link";
      a.href = o.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = o.label;
      links.appendChild(a);
    });
    if (d.flik) {
      const f = document.createElement("div");
      f.className = "donate-flik";
      f.textContent = "🟢 Flik: " + d.flik;
      links.appendChild(f);
    }
    const bankBox = document.getElementById("donate-bank");
    bankBox.textContent = (d.bank[L()] || d.bank.sl);
    renderDonateQr();
  }

  function renderDonateQr() {
    const qrBox = document.getElementById("donate-qr");
    if (!qrBox || !SITE.donate.qr) return;
    const base = location.pathname.includes("/games/") ? "../" : "";
    qrBox.innerHTML = '<img class="donate-qr" src="' + base + SITE.donate.qr + '" alt="UPN QR" />';
  }

  /* ---- na spremembo jezika osveži vse ---- */
  function rerender() {
    refreshLangBtn();
    renderTeam();
    renderStories();
    if (modal.classList.contains("open")) renderDonate();
  }
  window.AZV.onChange(rerender);
  rerender();
})();
