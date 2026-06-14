# Akcija za vse

Spletna stran z igrami in stripi, ki jih ustvarjajo bratje **Simon, Jakob in Andrej**.
Dvojezična (slovensko / angleško), brez ogrodij — same statične datoteke.

## Zgradba

| Datoteka | Kaj je |
|---|---|
| `index.html` | Domača stran: predstavitev avtorjev + izbira zgodb |
| `game.html` | Igra (Elektroni: strah v rokah) |
| `strip.html?story=ID` | Strip bralnik (lista strani) |
| `style.css` | Slog (videz stripa, karo papir) |
| `game.js` | Logika igre (dvojezična besedila v objektu `GT`) |
| `js/config.js` | **Nastavitve: avtorji, zgodbe, stripi, donacije** |
| `js/i18n.js` | Preklop jezika SL / EN |
| `js/hub.js` | Izris domače strani |
| `js/strip.js` | Strip bralnik |
| `js/page.js` | Skupna glava (jezik + donacije) na strani z igro |
| `assets/` | Slike stripov |

## Kako dodati novo zgodbo (brez programiranja)

Vse se ureja v [`js/config.js`](js/config.js):

1. **Strip:** dodaj strani v `comics` pod nov ID.
2. Dodaj vnos v `stories` z `author` (`"simon"` | `"jakob"` | `"andrej"`) ter
   poljem `game` (pot do igre) in/ali `comic` (ID stripa). Kartica sama prikaže
   ustrezne gumbe (Igraj / Beri strip).

Avtorji (slika + opis) se prav tako urejajo v `js/config.js` pod `authors`.
Fotografije avtorjev: daj `assets/avtor-simon.jpg` ipd.; če slike ni, se pokaže začetnica.

## Donacije

V `js/config.js` pod `donate` prilepi povezave (Stripe / PayPal / Ko-fi /
Buy Me a Coffee) in podatke za nakazilo. Prazne povezave se ne prikažejo.

## Lokalni zagon

```sh
python3 -m http.server 8123
```

Nato odpri <http://localhost:8123/>.
