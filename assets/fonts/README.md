# Blobio Flags

`blobio-flags.woff2` is a flag-only subset of Google's Noto COLRv1 emoji font,
licensed under the SIL Open Font License 1.1 (see `OFL.txt`). It supplies country
and subdivision flags on systems whose default emoji font displays country codes.

Source: [googlefonts/noto-emoji, commit 8998f5dd683424a73e2314a8c1f1e359c19e8742](https://github.com/googlefonts/noto-emoji/tree/8998f5dd683424a73e2314a8c1f1e359c19e8742).
Input: `fonts/Noto-COLRv1.ttf`. Subset with fontTools 4.65.0, retaining its color
tables, ligatures and license metadata, then compressed as WOFF2. Included code
points: U+1F1E6–1F1FF, U+1F3F4, U+FE0F and U+E0020–E007F. Family, full,
PostScript and unique name records were renamed to Blobio Flags.

SHA-256: `673de81affa575c253df995115d2ccef710bf441b55696e4e7a0262a467b09e4`.

The build embeds the font in both the userscript and bundle. Rendering makes no
font download requests. Other letters and emoji use the browser's available fonts.
