/* ===========================================================
   NASTAVITVE STRANI  (to datoteko mirno urejajte sami)
   - donate:  povezave za donacije
   - authors: avtorji (Simon / Jakob / Andrej) — slika + opis
   - stories: zgodbe (igra ali strip); vsaka ima svojega avtorja
   - comics:  strani stripov za bralnik (strip.html)

   KAKO DODATI NOVO ZGODBO:
   1) (strip) dodaj strani v "comics" pod nov ID
   2) dodaj vnos v "stories" z author: "simon" | "jakob" | "andrej"
   Nič drugega ni treba spreminjati.
   =========================================================== */

const SITE = {
  /* ---- DONACIJE ----
     Prazno ("") = gumb se ne prikaže. Ko dobite povezavo, jo prilepite. */
  donate: {
    paypal: "",   // npr. "https://paypal.me/uporabnik"
    kofi:   "",   // npr. "https://ko-fi.com/uporabnik"
    bmac:   "",   // npr. "https://buymeacoffee.com/uporabnik"
    stripe: "",   // Stripe Payment Link, npr. "https://buy.stripe.com/..."
    flik:   "rok7rupnik@gmail.com",   // Flik alias: e-pošta ALI telefon (mora biti registriran/aktiviran v Flik aplikaciji banke); prazno = se ne prikaže
    bank: {
      sl: "Ime: Rok Rupnik\nIBAN: SI56 0400 1010 4830 702\nNamen: Dar - Akcija za vse",
      en: "Name: Rok Rupnik\nIBAN: SI56 0400 1010 4830 702\nReference: Dar - Akcija za vse",
    },
    // QR (UPN) za slovenske banke – ustvarjen iz zgornjega TRR-ja (assets/qr-upn.png)
    qr: "assets/qr-upn.png",
  },

  /* ---- AVTORJI ----
     photo: pot do slike (npr. "assets/avtor-simon.jpg").
            Če slike (še) ni, se pokaže začetnica imena.
     bio:   kratek opis v SL / EN. */
  authors: {
    simon: {
      name: "Simon",
      photo: "assets/authors/simon.webp",
      bio: {
        sl: "Avtor igre Elektroni in mnogih zgodb. Ima res bujno domišljijo.",
        en: "Author of the game Electrons and many stories. Has a wild imagination.",
      },
    },
    jakob: {
      name: "Jakob",
      photo: "assets/authors/jakob.webp",
      bio: {
        sl: "Rad riše korenčke in napete stripe ter je čokolado.",
        en: "Likes drawing carrots and exciting comics, and eating chocolate.",
      },
    },
    andrej: {
      name: "Andrej",
      photo: "assets/authors/andrej.webp",
      bio: {
        sl: "Rad se kdaj razjezi in strga liste, ampak naredi tudi nove.",
        en: "Sometimes gets angry and tears up the pages, but makes new ones too.",
      },
    },
  },

  /* ---- ZGODBE NA DOMAČI STRANI ----
     Ena kartica = ena zgodba. Lahko ima igro in/ali strip:
       game:  pot do igre (npr. "games/game.html")  -> gumb "Igraj"
       comic: ID stripa iz "comics" spodaj     -> gumb "Beri strip"
     Navedi eno, drugo ali oboje.
     author: "simon" | "jakob" | "andrej" */
  stories: [
    {
      id: "elektroni",
      author: "simon",
      cover: "assets/elektroni/cover.webp",
      title: { sl: "Elektroni: strah v rokah", en: "Electrons: fear in their hands" },
      blurb: {
        sl: "Ti si elektron – prijazni hrček s strelami. Premagaj zlobne hrčke in velikega hrčka!",
        en: "You are an electron – a friendly hamster with lightning. Beat the evil hamsters and the big hamster!",
      },
      game: "games/game.html",
      comic: "elektroni",
    },
    {
      id: "ribji-klofut",
      author: "andrej",
      cover: "assets/ribji-klofut/cover.webp",
      title: { sl: "Ribji klofut", en: "Fish Slap" },
      blurb: {
        sl: "Ti si riba, ki strelja mehurčke in se s repom sabljaš. Plavaj po labirintu, pobiraj srčke za življenje in se izogni ogromnim ribam!",
        en: "You are a fish that shoots bubbles and sword-fights with its tail. Swim through the maze, collect hearts for life, and dodge the giant fish!",
      },
      comic: "ribji-klofut",
      game: "games/ribji-klofut.html",
    },
  ],

  /* ---- STRIPI ZA BRALNIK ---- (strip.html?story=ID) */
  comics: {
    elektroni: {
      author: "simon",
      title: { sl: "Elektroni – strip", en: "Electrons – comic" },
      pages: [
        "assets/elektroni/page-1.webp",
        "assets/elektroni/page-2.webp",
        "assets/elektroni/page-3.webp",
        "assets/elektroni/page-4.webp",
      ],
    },
    "ribji-klofut": {
      author: "andrej",
      title: { sl: "Ribji klofut", en: "Fish Slap" },
      pages: [
        "assets/ribji-klofut/page-1.webp",
      ],
    },
  },
};
