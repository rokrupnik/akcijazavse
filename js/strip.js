/* ===========================================================
   STRIP BRALNIK — lista strani (strip.html?story=ID)
   =========================================================== */
(function () {
  const L = () => window.AZV.lang;

  // katera zgodba?
  const params = new URLSearchParams(location.search);
  const id = params.get("story") || Object.keys(SITE.comics)[0];
  const comic = SITE.comics[id];

  const titleEl = document.getElementById("comic-title");
  const img = document.getElementById("comic-page");
  const ind = document.getElementById("page-ind");

  if (!comic) {
    titleEl.textContent = "?";
    return;
  }

  let page = 0;                          // 0 = uvod (povzetek), 1..N = strani stripa
  const last = comic.pages.length;       // zadnji indeks (uvod + N strani)
  const introBox = document.getElementById("comic-intro");

  function renderIntro() {
    const summary = (comic.intro && (comic.intro[L()] || comic.intro.sl)) ||
                    (comic.blurb && (comic.blurb[L()] || comic.blurb.sl)) || "";
    const startTxt = L() === "en" ? "Start reading ›" : "Začni branje ›";
    const badge = L() === "en" ? "The story" : "Zgodba";
    introBox.innerHTML =
      '<div class="intro-inner">' +
      '<div class="intro-badge"></div>' +
      '<p class="intro-text"></p>' +
      '<button class="ghost-btn intro-start"></button>' +
      '</div>';
    introBox.querySelector(".intro-badge").textContent = badge;
    introBox.querySelector(".intro-text").textContent = summary;
    const b = introBox.querySelector(".intro-start");
    b.textContent = startTxt;
    b.addEventListener("click", () => go(1));
  }

  function show() {
    page = Math.max(0, Math.min(last, page));
    if (page === 0) {
      img.style.display = "none";
      introBox.style.display = "";
      renderIntro();
      ind.textContent = L() === "en" ? "Intro" : "Uvod";
    } else {
      introBox.style.display = "none";
      img.style.display = "";
      img.src = comic.pages[page - 1];
      ind.textContent = page + " / " + comic.pages.length;
    }
    document.getElementById("prev").classList.toggle("disabled", page === 0);
    document.getElementById("prev2").disabled = page === 0;
    document.getElementById("next").classList.toggle("disabled", page === last);
    document.getElementById("next2").disabled = page === last;
  }
  function go(d) { page += d; show(); }

  ["prev", "prev2"].forEach((i) => document.getElementById(i).addEventListener("click", () => go(-1)));
  ["next", "next2"].forEach((i) => document.getElementById(i).addEventListener("click", () => go(1)));

  // tipkovnica
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") go(-1);
    if (e.key === "ArrowRight") go(1);
  });

  // drsanje (mobilni) — na celotnem odru, da deluje tudi na uvodu
  const stage = document.querySelector(".reader-stage");
  let sx = null;
  stage.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener("touchend", (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    sx = null;
  });

  // naslov + jezik
  function refreshLang() {
    document.getElementById("lang-btn").textContent = L() === "sl" ? "EN" : "SL";
    titleEl.textContent = comic.title[L()] || comic.title.sl;
    const author = SITE.authors[comic.author];
    document.getElementById("comic-author").textContent =
      author ? window.AZV.t("by_author") + " " + author.name : "";
    show();   // osveži uvod/indikator v izbranem jeziku
  }
  document.getElementById("lang-btn").addEventListener("click", () => window.AZV.toggle());

  /* ---- donacije (skupno z domačo stranjo) ---- */
  const modal = document.getElementById("donate-modal");
  document.querySelectorAll("[data-open-donate]").forEach((b) =>
    b.addEventListener("click", () => { modal.classList.add("open"); renderDonate(); })
  );
  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.hasAttribute("data-close-donate")) modal.classList.remove("open");
  });
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

  window.AZV.onChange(refreshLang);
  refreshLang();
})();
