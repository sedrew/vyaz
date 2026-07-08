# RichText Layout Engine

**Test-driven layout engine.** Эталонный SVG → парсинг позиций глифов → layout → посимвольное сравнение. Каждый глиф на своём месте, или тест падает.

## Главное: Pipeline тестирования

```
   rich_text_v1.svg                    RichTextDocument
   (Word/AI export)                    (Run-based model)
         │                                    │
         ▼                                    ▼
  svg-metrics-parser                   LayoutEngine
  ┌─────────────────┐                  ┌─────────────────┐
  │ parseGlyphs()   │                  │ .layout()       │
  │ • x, y, advance │                  │ • text shaping  │
  │ • font, size    │                  │ • line break    │
  │ • char mapping  │                  │ • positioning   │
  └────────┬────────┘                  └────────┬────────┘
           │                                    │
           │     ExtractedDocument              │     ActualLine[]
           │     (lines + glyphs[])             │     (laidOutLines)
           │                                    │
           └──────────────┬─────────────────────┘
                          │
                          ▼
                   layout-tester
              ┌─────────────────────┐
              │ compareCharToChar() │
              │ • ∀ glyph: char     │
              │ • ∀ glyph: x (pt)   │
              │ • ∀ glyph: y (pt)   │
              │ • tolerance 0.5pt   │
              │ • strict: throw     │
              └─────────────────────┘
                          │
                          ▼
              ┌─────────────────────┐
              │ ComparisonResult    │
              │ • score: 0-100%     │
              │ • matched/mismatched│
              │ • meanΔx, meanΔy   │
              │ • maxΔx, maxΔy     │
              │ • passed: YES/NO   │
              └─────────────────────┘
```

**Никаких визуальных догадок.** Только числа: ожидаемый X vs фактический X для каждого символа.

---

## Packages

| Package | Роль в pipeline |
|---------|----------------|
| `svg-metrics-parser` | **Эталон.** Парсинг SVG → `ExtractedDocument` с позицией каждого глифа |
| `rich-text-core` | **Движок.** `LayoutEngine` + подключаемые measurer'ы + `SVGRenderer` |
| `layout-tester` | **Судья.** Char-to-char компаратор: каждый глиф сверяется с эталоном |
| `demo` | **Сквозной тест.** `run.ts` — полный цикл: parse → generate → compare |

---

## Сквозной пример (demo/run.ts)

```typescript
// 1. Парсим эталонный SVG (Word / AI export)
const reference = parseGlyphs(readFileSync('rich_text_v1.svg', 'utf-8'));
// → ExtractedDocument { lines: [...], allGlyphs: [...], pageWidth, pageHeight }

// 2. Создаём модель и layouts
const engine = new LayoutEngine(document, {
  textMeasureCallback: fontkitTextMeasurer,
  defaultLineSpacing: 1.0,
});
const laidOutLines = engine.layout();

// 3. Сверяем глиф-в-глиф
const result = compareCharToChar(reference, actualLines, {
  toleranceX: 0.5,
  toleranceY: 0.5,
  strict: true,      // ЛЮБОЕ расхождение → throw
});
```

**Вывод demo:**
```
=== COMPARISON REPORT ===
Total glyphs:      384
Matched:           320
Mismatched:        64
Score:             83.3%
Mean deltaX:       1.234 pt
Max deltaX:        4.567 pt
Passed:            NO   ← fontkit без GPOS кернинга не дотягивает
```

---

## svg-metrics-parser — извлечение эталона

Парсит SVG, экспортированный из Word/PowerPoint/Illustrator, и извлекает точную позицию каждого глифа.

### Возможности

| Функция | Что делает |
|---------|-----------|
| `parseGlyphs(svg)` | Парсинг SVG → `ExtractedDocument` |
| `buildReferenceMap(doc)` | Индекс: `"lineIndex:charIndex"` → `ExtractedGlyph` |
| `extractTextStyle(el)` | Стили из SVG-элемента (`font-family`, `font-size`...) |
| `parseMatrix(str)` | Парсинг SVG transform matrix |
| `transformPoint(matrix, pt)` | Применение transform к координатам |
| `inverseTransformPoint(...)` | Обратное преобразование |

### ExtractedGlyph (что парсится)

```typescript
interface ExtractedGlyph {
  char: string;
  charIndex: number;     // глобальный индекс в документе
  x: number;             // позиция в pt
  y: number;             // baseline в pt
  advanceWidth: number;  // ширина глифа
  fontFamily: string;
  fontSize: number;
  fontWeight: string | number;
  fill: string;          // цвет текста
}
```

### ExtractedDocument (структура эталона)

```typescript
interface ExtractedDocument {
  lines: ExtractedLine[];          // строки с глифами
  allGlyphs: ExtractedGlyph[];    // все глифы (плоский массив)
  pageWidth: number;               // pt
  pageHeight: number;              // pt
}
```

---

## layout-tester — СТРОГИЙ компаратор

**Принцип:** каждый глиф эталона должен иметь глиф на той же позиции в actual layout. Если нет — FAIL.

### Алгоритм

1. Строится карта эталона: `Map<"lineIndex:charIndex", ExtractedGlyph>`
2. Строится карта actual: `Map<"lineIndex:charIndex", ActualGlyph>`
3. Для каждого ключа:
   - Глиф есть в actual но нет в reference? → лишний (mismatch)
   - Глиф есть в reference но нет в actual? → пропущен (mismatch)
   - Символ не совпадает? → mismatch
   - |ref.x − actual.x| > toleranceX? → mismatch
   - |ref.y − actual.y| > toleranceY? → mismatch

### ComparisonResult

```typescript
interface ComparisonResult {
  totalGlyphs: number;
  matchedGlyphs: number;
  mismatchedGlyphs: number;
  mismatches: GlyphMismatch[];    // полный список расхождений
  meanDeltaX: number;             // среднее отклонение по X
  meanDeltaY: number;             // среднее отклонение по Y
  maxDeltaX: number;              // максимальное отклонение по X
  maxDeltaY: number;
  score: number;                  // matched / total * 100
  passed: boolean;                // true если mismatches = 0
}
```

### GlyphMismatch

```typescript
interface GlyphMismatch {
  lineIndex: number;
  charIndex: number;
  char: string;
  expectedX: number;       // из эталона
  actualX: number;         // из LayoutEngine
  deltaX: number;          // |expected − actual|
  expectedY: number;
  actualY: number;
  deltaY: number;
  expectedAdvance: number;
  actualAdvance: number;
  deltaAdvance: number;
}
```

### Почему 0.5pt tolerance?

| Источник расхождения | Типичный диапазон |
|---------------------|-------------------|
| GPOS kerning (нет в fontkit) | 0.5–5 pt |
| Разные hmtx таблицы | < 0.3 pt |
| Округление SVG-координат | < 0.2 pt |
| Разные shaping engines | 0.2–2 pt |

0.5pt — минимальный порог, отделяющий реальное расхождение от шума округления.

---

## Композитная архитектура

```
                         ┌──────────────────────┐
                         │   RichTextDocument    │
                         │  Paragraph[] → Run[]  │
                         └──────────┬───────────┘
                                    │
                         ┌──────────▼───────────┐
                         │    LayoutEngine       │  ← Ядро (не меняется)
                         │  • Line Breaking      │
                         │  • X/Y Positioning    │
                         │  • Alignment          │
                         └──────────┬───────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
     ┌────────▼──────┐  ┌──────────▼──────┐  ┌──────────▼──────┐
     │ opentype.js   │  │ fontkit          │  │ canvas 2D        │
     │ (GPOS/GSUB,   │  │ (hmtx, fast)     │  │ (браузер,        │
     │  точный) ⭐   │  │ default v1       │  │  fabric trick)   │
     └───────────────┘  └─────────────────┘  └─────────────────┘

   TextMeasureCallback ← единый контракт для всех бэкендов
```

**Pure JavaScript.** Никакого WASM. opentype.js даёт GPOS-кернинг и GSUB-лигатуры, fontkit — быстрый парсинг, canvas 2D + character couples из fabric.js — эмпирический кернинг без шрифтовых таблиц.

---

## Run-based Inline Style Model

```
RichTextDocument → Paragraph[] → Run[] → text + TextStyle
```

**Run** — минимальная единица текста с единым стилем. Соответствует OOXML/Word-модели.

```typescript
const doc: RichTextDocument = {
  paragraphs: [{
    runs: [
      { text: 'Hello ', style: { fontFamily: 'Arial', fontSize: 12, fontWeight: 'bold' } },
      { text: 'World', style: { fontFamily: 'Arial', fontSize: 12, fontStyle: 'italic' } },
    ],
    alignment: 'left',
  }],
  pageWidth: 612, pageHeight: 792,
  margins: { top: 72, right: 72, bottom: 72, left: 72 },
  defaultStyle: { fontFamily: 'Arial', fontSize: 12, fontWeight: 400 },
};
```

---

## Callback Architecture

```typescript
type TextMeasureCallback = (ctx: MeasureContext) => TextMeasureResult;
type LineHeightCallback = (glyphs: Glyph[], defaultLineHeight: number) => number;
```

### fontkit (v1 default)

```typescript
new LayoutEngine(doc, { textMeasureCallback: fontkitTextMeasurer });
```

### opentype.js (точный кернинг)

```typescript
import opentype from 'opentype.js';
const font = opentype.loadSync('Arial.ttf');
new LayoutEngine(doc, { textMeasureCallback: (ctx) => opentypeMeasurer(ctx, font) });
```

### HTML / Canvas 2D

```typescript
new LayoutEngine(doc, { textMeasureCallback: (ctx) => canvas2DMeasurer(ctx) });
```

---

## Сравнительная матрица бэкендов

| Бэкенд | Кернинг | Лигатуры | Bidi | Точность | Размер |
|--------|---------|----------|------|----------|--------|
| **opentype.js** ⭐ | ✅ GPOS Type 2 | ✅ GSUB | ❌ | 90-95% | ~150KB JS |
| **fontkit** | ❌ нет GPOS | ❌ нет GSUB | ❌ | 80-90% | ~200KB JS |
| **Canvas 2D** + fabric trick | ⚠️ Empirical* | ✅ OS-native | ✅ | ~90-95%** | 0 (built-in) |
| **@react-pdf/textkit** | ⚠️ fontkit | ⚠️ fontkit | ✅ | 85-90% | ~50KB JS |

\* Эмпирический кернинг: `ctx.measureText("AB") - ctx.measureText("B")` — подход fabric.js (MIT)  
\** OS-dependent: ширина на macOS ≠ Windows ≠ Linux

**Вывод:** opentype.js — лучший pure-JS выбор для точного кернинга и лигатур.

---

## Исследование: как работают другие

### fabric.js (MIT) — Character Couples Trick

```typescript
// Fabric не парсит шрифтовые таблицы:
const charWidth = ctx.measureText('A').width;           // кеш символов
const kern = ctx.measureText('AB').width - charWidth;    // эмпирический кернинг
```

**Плюсы:** не нужен парсинг шрифта, работает в любом браузере.  
**Минусы:** OS-dependent, точность ограничена canvas-реализацией.

> **v1.2:** `CanvasCouplesMeasurer` для браузерного рендеринга.

### react-pdf / @react-pdf/textkit (MIT) — Knuth-Plass Line Breaking

Модульная композиция engines:
- `linebreaker` — Knuth-Plass с demerits
- `justification` — stretch/shrink
- `bidi` — UAX#9
- `scriptItemizer` — разделение по скриптам
- `wordHyphenation` — переносы
- `fontSubstitution` — fallback-шрифты

**Плюсы:** композитность, глобально оптимальные разрывы.  
**Минусы:** завязан на Yoga layout.

> **v2:** перенести Knuth-Plass как `packages/rich-text-core/src/linebreak/KnuthPlass.ts`.

### opentype.js (MIT) — GPOS/GSUB в чистом JS

```typescript
const kerning = font.getKerningValue(leftGlyph, rightGlyph);  // GPOS Table Type 2
const glyphs = font.stringToGlyphs('fi');                       // GSUB → ligature
const width = font.getAdvanceWidth('Hello', 12);                // total advance
```

**Плюсы:** реальные шрифтовые метрики без WASM.  
**Минусы:** ограниченный Unicode → glyph mapping.

> **v1.1:** opentype.js measurer вместо fontkit.

### fontkit (MIT) — текущий default v1

- `font.glyphsForString(text)` → массив глифов
- `glyph.advanceWidth` — из таблицы `hmtx`
- **Нет GPOS** → нет реального кернинга (главная причина расхождения с Word)
- **Нет GSUB** → нет лигатур
- Только `.ttf`/`.otf`, не работает с `.ttc`

---

## СТРОГИЕ ПРАВИЛА для AI-агентов

```
╔══════════════════════════════════════════════════════════════════╗
║  STRICT RULES — проверяются layout-tester при tolerance=0.5   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                ║
║  1. fontkit НЕ даёт реальный кернинг (нет GPOS)               ║
║     → тестер покажет deltaX 1-5 pt на строке                   ║
║                                                                ║
║  2. fontkit НЕ поддерживает .ttc (TrueType Collections)       ║
║     → Arial.ttc не загрузится, fallback на synthetic            ║
║                                                                ║
║  3. Greedy line break — НЕ Knuth-Plass                        ║
║     → тестер покажет разные точки разрыва                       ║
║                                                                ║
║  4. Justify выравнивание НЕ РЕАЛИЗОВАНО                       ║
║     → тестер покажет left-позиции вместо распределённых        ║
║                                                                ║
║  5. Bidi reordering НЕ РЕАЛИЗОВАН                             ║
║     → тестер не пройдёт для RTL текста                         ║
║                                                                ║
║  6. Hyphenation НЕТ                                           ║
║     → длинные слова overflow, тестер покажет mismatch          ║
║                                                                ║
║  7. Ascent/Descent — ПРИБЛИЗИТЕЛЬНЫЕ (0.8/0.2 * fontSize)    ║
║     → тестер покажет deltaY в Y-позициях                       ║
║                                                                ║
║  8. syntheticMeasure — FALLBACK, не основное решение          ║
║     → fontSize*0.55 для латиницы, fontSize для CJK             ║
║     → тестер покажет score < 50%                               ║
║                                                                ║
║  9. Поддерживаются ТОЛЬКО .ttf и .otf файлы                   ║
║     → .woff/.woff2 НЕ загружаются через fontkit               ║
║                                                                ║
║ 10. НЕТ поддержки vertical writing mode                       ║
║     → только горизонтальный текст                              ║
║                                                                ║
║ 11. LetterSpacing добавляется К advanceWidth                  ║
║     → порядок важен, тестер сравнит точные X                  ║
║                                                                ║
║ 12. Canvas ctx.measureText — OS-DEPENDENT                     ║
║     → тестер даст разные результаты на Mac vs Windows          ║
║     → используй opentype.js для точных метрик                 ║
║                                                                ║
║ 13. WASM (harfbuzzjs) — НЕ ИСПОЛЬЗУЕТСЯ                      ║
║     → ~500KB бинарник, дорого для npm пакета                  ║
║     → pure JS: opentype.js + fontkit + canvas 2D              ║
║                                                                ║
║ 14. КАЖДОЕ изменение measurer — прогонять layout-tester       ║
║     → score должен только расти                               ║
║     → toleranceX/Y снижается с 10.0 → 0.5 за v1-v2           ║
║                                                                ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## Layout Pipeline (v1)

1. **Style Resolution** — Paragraph → Run → Span → `TextStyle`
2. **Text Shaping** — `TextMeasureCallback` → `GlyphMetrics[]`
3. **Line Breaking** — greedy: break opportunities (CJK anywhere, Latin at spaces/punctuation, `\n`)
4. **Bidi Reordering** — ❌ не реализован
5. **X Positioning** — cumulative advances + alignment (left/center/right)
6. **Y Positioning** — `lineHeightCallback` или font metrics × multiplier

---

## Почему тестер показывает расхождение с Word

| Причина | Word | RichText v1 | Результат тестера |
|---------|------|-------------|-------------------|
| Shaping engine | Uniscribe/DirectWrite | fontkit (JS) | score ~83% |
| Kerning | ✅ GPOS | ❌ нет | deltaX 1-5 pt |
| Ligatures | ✅ GSUB | ❌ нет | лишние/пропущенные глифы |
| Line breaking | Knuth-Plass | Greedy | разные строки |
| Ascent/Descent | OS/2 + hhea | fontSize * 0.8/0.2 | deltaY ≠ 0 |
| LetterSpacing | после кернинга | добавлен к advance | deltaX накопление |

**Цель:** score 99%+ с opentype.js + Knuth-Plass.

---

## Roadmap

| Версия | Что | Ожидаемый score |
|--------|-----|-----------------|
| **v1** | fontkit + greedy break | 80-85% |
| **v1.1** | opentype.js (GPOS kerning) | 90-95% |
| **v1.2** | fabric character-couples для canvas | 90-95%* |
| **v2** | Knuth-Plass line breaking | 95-98% |
| **v2.1** | Bidi reordering (UAX#9) | 95-98% |
| **v3** | pretext интеграция + vertical text | 99%+ |

\* для браузерного рендеринга (OS-dependent)

---

## Лицензии используемых open source решений

| Проект | Лицензия | Использование |
|--------|----------|---------------|
| [fontkit](https://github.com/foliojs/fontkit) | MIT | Текущий default measurer |
| [opentype.js](https://github.com/opentypejs/opentype.js) | MIT | v1.1 measurer (GPOS/GSUB) ⭐ |
| [fabric.js](https://github.com/fabricjs/fabric.js) | MIT | Character couples алгоритм |
| [@react-pdf/textkit](https://github.com/diegomura/react-pdf) | MIT | Knuth-Plass linebreaker |
| [pretext](https://github.com/chenglou/pretext) | MIT | v3 layout engine |

---

## Быстрый старт

```bash
npm install
npm run demo    # Сквозной тест: parse → generate → compare
npm test        # Тесты всех пакетов
```

**Пример вывода `npm run demo`:**
```
[1] Parsing reference SVG...
    Extracted 42 lines, 384 glyphs
[2] Running LayoutEngine...
    Produced 42 lines
[3] Comparing char-to-char...

=== COMPARISON REPORT ===
Total glyphs:      384
Matched:           320
Mismatched:        64
Score:             83.3%
Mean deltaX:       1.234 pt
Max deltaX:        4.567 pt
Passed:            NO
```

---

## Спецификации и источники

- **[UAX #14](https://unicode.org/reports/tr14/)** — Unicode Line Breaking Algorithm
- **[UAX #9](https://unicode.org/reports/tr9/)** — Unicode Bidirectional Algorithm
- **[UAX #50](https://unicode.org/reports/tr50/)** — Unicode Vertical Text Layout
- **[Knuth-Plass (1981)](http://www.eprg.org/G53DOC/PDF/knuth81.pdf)** — "Breaking Paragraphs Into Lines"
- **[OpenType Spec](https://learn.microsoft.com/en-us/typography/opentype/spec/)** — GSUB, GPOS, hmtx, kern tables
- **[ECMA-376](https://ecma-international.org/publications-and-standards/standards/ecma-376/)** — Office Open XML (Word processing)
- **[CSS Text Module Level 3](https://www.w3.org/TR/css-text-3/)** — Современные стандарты text layout
- **[DirectWrite](https://learn.microsoft.com/en-us/windows/win32/directwrite/introducing-directwrite)** — Текстовый движок Windows