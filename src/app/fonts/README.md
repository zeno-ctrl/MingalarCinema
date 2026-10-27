# Locally hosted fonts

These are the official, unmodified variable TTFs from the Google Fonts repository,
pinned to commit `e7db6ca603fd4862010383ff17ffd6cc4ffac1c0`. They are loaded through
`next/font/local` so builds do not fetch Google Fonts CSS or font files. Both
fonts retain their full upstream glyph coverage, and weights 100–900 are available;
this includes all weights used by the website and its Myanmar text.

Sources:

- Inter: https://github.com/google/fonts/blob/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf
- Noto Sans Myanmar: https://github.com/google/fonts/blob/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/notosansmyanmar/NotoSansMyanmar%5Bwdth%2Cwght%5D.ttf

The corresponding upstream `METADATA.pb` and SIL Open Font License `OFL.txt` are
included beside each font. `SHA256SUMS` records the exact downloaded files; verify
with `sha256sum -c SHA256SUMS` from this directory. Filenames are shortened locally
for portable paths; font contents and font family names have not been modified.

The existing CSS variables `--font-inter` and `--font-noto-mm` and `display: swap`
behavior are preserved. Fonts are served as same-origin application assets.
