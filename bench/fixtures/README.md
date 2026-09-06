# bench/fixtures

`PT_Sans-Web-{Regular,Bold,Italic,BoldItalic}.ttf` — static (non-variable)
weights of [PT Sans](https://github.com/google/fonts/tree/main/ofl/ptsans),
© 2010 ParaType Ltd., [SIL Open Font License 1.1](./OFL.txt).

Used by [`../vs-satori.ts`](../vs-satori.ts). Needs to be a **static** font:
Satori's font parser (a fork of `opentype.js`) throws on `fvar` (variable-font
axis table), so the project's usual variable-font fixtures
(`packages/core/tests/fixtures/Inter-Variable.ttf`,
`Roboto-VariableFont_wdth,wght.ttf`) don't work here — see the comment at the
top of `vs-satori.ts`.
