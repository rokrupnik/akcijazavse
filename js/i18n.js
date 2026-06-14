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
      game_hint:     'Tipke: <b>↑ ↓</b> ali <b>W / S</b> za gor-dol &nbsp;•&nbsp; <b>Preslednica</b> = strela &nbsp;•&nbsp; <b>M</b> = super moč (ko je polna) &nbsp;•&nbsp; na telefonu: <b>tapni</b> za strelo, <b>drsaj</b> za premik<br />💡 Poberi <b>3 elektrike</b> in dobiš nazaj <b>eno življenje</b> ❤️',
      rk_title:      "🐟 Ribji klofut 🐟",
      rk_hint:       'Tipke: <b>↑ ↓ ← →</b> ali <b>W A S D</b> za plavanje &nbsp;•&nbsp; <b>Preslednica</b> = mehurček &nbsp;•&nbsp; <b>M</b> = klofuta z repom &nbsp;•&nbsp; na telefonu: <b>drsaj</b> za plavanje, <b>tapni</b> za mehurček, <b>dvojni tap</b> za rep<br />💡 Poberi <b>srčke</b> ❤️ za življenje. Premagaj velikansko ribo!',
      k_title:       "🥕 Noč strašnih korenčkov 🐱",
      k_hint:        'Tipke: <b>↑ ↓ ← →</b> ali <b>W A S D</b> za hojo &nbsp;•&nbsp; <b>Preslednica</b> = krempljček &nbsp;•&nbsp; <b>M</b> = ugriz &nbsp;•&nbsp; na telefonu: <b>drsaj</b> za hojo, <b>tapni</b> za krempelj, <b>dvojni tap</b> za ugriz<br />💡 Poberi <b>srčke</b> ❤️ za življenje. Premagaj velikanski korenček!',
    },
    en: {
      site_title:    "Action for everyone",
      site_tagline:  "Games and comics made by us brothers.",
      nav_home:      "Home",
      nav_donate:    "Donate ♥",
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
      game_hint:     'Keys: <b>↑ ↓</b> or <b>W / S</b> to move &nbsp;•&nbsp; <b>Space</b> = shoot &nbsp;•&nbsp; <b>M</b> = super power (when charged) &nbsp;•&nbsp; on phone: <b>tap</b> to shoot, <b>swipe</b> to move<br />💡 Collect <b>3 electricities</b> to get back <b>one life</b> ❤️',
      rk_title:      "🐟 Fish Slap 🐟",
      rk_hint:       'Keys: <b>↑ ↓ ← →</b> or <b>W A S D</b> to swim &nbsp;•&nbsp; <b>Space</b> = bubble &nbsp;•&nbsp; <b>M</b> = tail slap &nbsp;•&nbsp; on phone: <b>swipe</b> to swim, <b>tap</b> for bubble, <b>double-tap</b> for tail<br />💡 Collect <b>hearts</b> ❤️ for life. Beat the giant fish!',
      k_title:       "🥕 Night of the Scary Carrots 🐱",
      k_hint:        'Keys: <b>↑ ↓ ← →</b> or <b>W A S D</b> to walk &nbsp;•&nbsp; <b>Space</b> = claw &nbsp;•&nbsp; <b>M</b> = bite &nbsp;•&nbsp; on phone: <b>swipe</b> to walk, <b>tap</b> for claw, <b>double-tap</b> to bite<br />💡 Collect <b>hearts</b> ❤️ for life. Beat the giant carrot!',
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
