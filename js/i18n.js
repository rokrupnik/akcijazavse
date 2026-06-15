/* ===========================================================
   PREKLOP JEZIKA (SL / EN)
   - izbrani jezik se shrani v brskalnik (localStorage)
   - vsa besedila strani imajo atribut data-i18n="kljuc"
   - igra (game.js) prebere isti jezik iz localStorage
   =========================================================== */
(function () {
  const KEY = "azv-lang";

  const dict = {
    sl: {
      site_title:    "Akcija za vse",
      site_tagline:  "Igre in stripi, ki jih ustvarjamo bratje.",
      nav_home:      "Domov",
      nav_donate:    "Doniraj ♥",
      nav_share:     "Deli",
      share_copied:  "Povezava kopirana! 📋",
      team_heading:  "Naša ekipa",
      stories_heading: "Izberi zgodbo",
      coming_soon:   "Kmalu novo!",
      play_btn:      "Igraj ▶",
      read_btn:      "Beri strip 📖",
      type_game:     "Igra",
      type_strip:    "Strip",
      by_author:     "Avtor:",
      back_home:     "← Nazaj na domov",
      comic_prev:    "‹ Nazaj",
      comic_next:    "Naprej ›",
      donate_heading: "Podpri ekipo ♥",
      donate_text:   "Igre in stripe delamo trije bratje. Vsak evro nas razveseli in spodbudi k novim zgodbam. Nakazujete našemu očetu Roku. Hvala!",
      donate_bank_heading: "Ali nakaži na račun:",
      donate_close:  "Zapri",
      footer_made:   "Naredili bratje · za zabavo in učenje",
      game_title:    "⚡ Elektroni: strah v rokah ⚡",
      game_hint:     'Tipke: <b>↑ ↓</b> ali <b>W / S</b> &nbsp;•&nbsp; <b>Preslednica</b> = strela &nbsp;•&nbsp; <b>M</b> = super moč (ko je polna)<br />📱 Telefon: <b>joystick</b> (spodaj levo) za premik, <b>gumba</b> (spodaj desno) za strelo in super moč<br />💡 Poberi <b>3 elektrike</b> in dobiš nazaj <b>eno življenje</b> ❤️',
      rk_title:      "🐟 Ribji klofut 🐟",
      rk_hint:       'Tipke: <b>↑ ↓ ← →</b> ali <b>W A S D</b> za plavanje &nbsp;•&nbsp; <b>Preslednica</b> = mehurček &nbsp;•&nbsp; <b>M</b> = klofuta z repom<br />📱 Telefon: <b>joystick</b> (spodaj levo) za plavanje, <b>gumba</b> (spodaj desno) za mehurček in rep<br />💡 Poberi <b>srčke</b> ❤️ za življenje. Premagaj velikansko ribo!',
      k_title:       "🥕 Noč strašnih korenčkov 🐱",
      k_hint:        'Tipke: <b>↑ ↓ ← →</b> ali <b>W A S D</b> za hojo &nbsp;•&nbsp; <b>Preslednica</b> = krempljček &nbsp;•&nbsp; <b>M</b> = ugriz<br />📱 Telefon: <b>joystick</b> (spodaj levo) za hojo, <b>gumba</b> (spodaj desno) za krempelj in ugriz<br />💡 Poberi <b>srčke</b> ❤️ za življenje. Premagaj velikanski korenček!',
      iz_title:      "🧟 Invazija zombijev 🧟",
      iz_hint:       'Tipke: <b>↑ ↓ ← →</b> ali <b>W A S D</b> za premik &nbsp;•&nbsp; <b>Preslednica</b> = minigun &nbsp;•&nbsp; <b>M</b> = kij<br />📱 Telefon: <b>joystick</b> (spodaj levo) za premik, <b>gumba</b> (spodaj desno) za minigun in kij<br />💡 Ozdravi zombije nazaj v ljudi in premagaj veliko zombijevo glavo!',
      np_title:      "➖ Napad palčk ➖",
      np_hint:       '1D dvoboj! <b>Modri</b>: <b>A</b> = strel, <b>Q</b> = močan naboj &nbsp;•&nbsp; <b>Rdeči</b> (2 igralca): <b>L</b> = strel, <b>O</b> = močan naboj<br />📱 Telefon: <b>tapni</b> svojo polovico = strel, <b>drži</b> = močan naboj<br />💡 Naboji: 3 strele, nato premor 2–3 s. Izstrelka se ob trku izničita (POK!). Vsak zadetek skrči nasprotnika — kdor se skrči v piko, izgubi!',
    },
    en: {
      site_title:    "Action for everyone",
      site_tagline:  "Games and comics made by us brothers.",
      nav_home:      "Home",
      nav_donate:    "Donate ♥",
      nav_share:     "Share",
      share_copied:  "Link copied! 📋",
      team_heading:  "Our team",
      stories_heading: "Choose a story",
      coming_soon:   "New ones coming soon!",
      play_btn:      "Play ▶",
      read_btn:      "Read comic 📖",
      type_game:     "Game",
      type_strip:    "Comic",
      by_author:     "Author:",
      back_home:     "← Back to home",
      comic_prev:    "‹ Back",
      comic_next:    "Next ›",
      donate_heading: "Support the team ♥",
      donate_text:   "Three brothers make these games and comics. Every euro makes us happy and inspires new stories. You're sending to our dad, Rok. Thank you!",
      donate_bank_heading: "Or send to our account:",
      donate_close:  "Close",
      footer_made:   "Made by brothers · for fun and learning",
      game_title:    "⚡ Electrons: fear in their hands ⚡",
      game_hint:     'Keys: <b>↑ ↓</b> or <b>W / S</b> &nbsp;•&nbsp; <b>Space</b> = shoot &nbsp;•&nbsp; <b>M</b> = super power (when charged)<br />📱 Phone: <b>joystick</b> (bottom-left) to move, <b>buttons</b> (bottom-right) to shoot & super power<br />💡 Collect <b>3 electricities</b> to get back <b>one life</b> ❤️',
      rk_title:      "🐟 Fish Slap 🐟",
      rk_hint:       'Keys: <b>↑ ↓ ← →</b> or <b>W A S D</b> to swim &nbsp;•&nbsp; <b>Space</b> = bubble &nbsp;•&nbsp; <b>M</b> = tail slap<br />📱 Phone: <b>joystick</b> (bottom-left) to swim, <b>buttons</b> (bottom-right) for bubble & tail<br />💡 Collect <b>hearts</b> ❤️ for life. Beat the giant fish!',
      k_title:       "🥕 Night of the Scary Carrots 🐱",
      k_hint:        'Keys: <b>↑ ↓ ← →</b> or <b>W A S D</b> to walk &nbsp;•&nbsp; <b>Space</b> = claw &nbsp;•&nbsp; <b>M</b> = bite<br />📱 Phone: <b>joystick</b> (bottom-left) to walk, <b>buttons</b> (bottom-right) for claw & bite<br />💡 Collect <b>hearts</b> ❤️ for life. Beat the giant carrot!',
      iz_title:      "🧟 Zombie Invasion 🧟",
      iz_hint:       'Keys: <b>↑ ↓ ← →</b> or <b>W A S D</b> to move &nbsp;•&nbsp; <b>Space</b> = minigun &nbsp;•&nbsp; <b>M</b> = club<br />📱 Phone: <b>joystick</b> (bottom-left) to move, <b>buttons</b> (bottom-right) for minigun & club<br />💡 Cure the zombies back into people and beat the giant zombie head!',
      np_title:      "➖ Attack of the Dashes ➖",
      np_hint:       '1D duel! <b>Blue</b>: <b>A</b> = shoot, <b>Q</b> = charged shot &nbsp;•&nbsp; <b>Red</b> (2 players): <b>L</b> = shoot, <b>O</b> = charged shot<br />📱 Phone: <b>tap</b> your half = shoot, <b>hold</b> = charged shot<br />💡 Ammo: 3 shots, then a 2–3 s pause. Two shots cancel out on impact (POW!). A hit shrinks your rival — shrink to a dot and you lose!',
    },
  };

  let lang = localStorage.getItem(KEY) === "en" ? "en" : "sl";
  const listeners = [];

  function t(k) {
    return (dict[lang] && dict[lang][k]) || dict.sl[k] || k;
  }

  function apply() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      el.innerHTML = t(el.getAttribute("data-i18n-html"));
    });
    const titleEl = document.querySelector("[data-i18n-doctitle]");
    if (titleEl) document.title = t(titleEl.getAttribute("data-i18n-doctitle"));
    listeners.forEach((fn) => fn(lang));
  }

  function setLang(l) {
    lang = l === "en" ? "en" : "sl";
    localStorage.setItem(KEY, lang);
    apply();
  }

  window.AZV = {
    get lang() { return lang; },
    t: t,
    apply: apply,
    setLang: setLang,
    toggle: function () { setLang(lang === "sl" ? "en" : "sl"); },
    onChange: function (fn) { listeners.push(fn); },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
})();
