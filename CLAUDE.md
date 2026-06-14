# CLAUDE.md — navodila za delo na projektu

Spletna stran **Akcija za vse** (akcijazavse.si): igre in stripi bratov Simon, Jakob in Andrej.
Statične datoteke, brez ogrodij. Dvojezično (SL/EN). Podrobnosti o zgradbi so v [README.md](README.md).

## Dodajanje nove zgodbe iz skeniranega PDF

Nove risbe/stripi prispejo kot **PDF v mapo `Input/`**.

Postopek obdelave:

1. **Renderiraj strani** PDF v slike:
   ```sh
   pdftoppm -r 150 -png "Input/<datoteka>.pdf" /tmp/<id>/p
   ```
2. **Pretvori v WebP** v lastno mapo zgodbe `assets/<id>/`:
   - polne strani: `cwebp -q 80 -resize 1200 0 p-N.png -o assets/<id>/page-N.webp`
   - naslovnica (thumbnail, manjša): `cwebp -q 72 -resize 600 0 p-1.png -o assets/<id>/cover.webp`
3. **Dodaj zgodbo** v [`js/config.js`](js/config.js):
   - vnos v `stories` (z `author`, `cover`, `title`, `blurb`, `comic` in/ali `game`)
   - vnos v `comics` (`pages` = seznam WebP strani)
4. **Preveri** v predogledu (domača stran + strip bralnik).
5. **Izbriši izvorni PDF iz `Input/`** — vhodne datoteke se ne hranijo in se ne commitajo.

## Pravila

- **PDF-ji se NE commitajo** (`.gitignore`: `*.pdf`, `Input/`). Vhodne PDF po obdelavi izbriši.
- Slike vedno kot **WebP**, organizirane po zgodbah v `assets/<id>/`.
- Avtorji so `simon`, `jakob`, `andrej` (urejajo se v `js/config.js` pod `authors`).
- Delaj na veji `main`; remote: `git@github.com:rokrupnik/akcijazavse.git`.
