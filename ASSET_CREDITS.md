# Asset credits

## Caveat (handwritten annotation font)

- **Source:** [Google Fonts — Caveat](https://fonts.google.com/specimen/Caveat),
  variable-weight TTF fetched from
  `https://raw.githubusercontent.com/google/fonts/main/ofl/caveat/Caveat%5Bwght%5D.ttf`
- **Author:** The Caveat Project Authors (https://github.com/googlefonts/caveat)
- **Licence:** SIL Open Font License, Version 1.1 — full text vendored at
  `src/assets/fonts/OFL.txt`
- **Local path:** `src/assets/fonts/Caveat-Variable.woff2`
- **Modification:** recompressed from the upstream TTF to WOFF2 with
  `fontTools` (`font.flavor = "woff2"`) to reduce file size for this
  static site. No glyphs, hinting, or metadata were altered.
- **Usage:** loaded locally via `@font-face` in `styles.css` — no runtime
  request to Google Fonts or any third-party host. Applied only to
  `.annotation-note` (curator commentary); the title and body copy stay in
  the existing serif stack for legibility.
