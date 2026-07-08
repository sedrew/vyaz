# Pixel-Perfect Text Layout для MS Office

Задача **«пиксель-в-пиксель»** (Pixel-Perfect Replication) для движка рендеринга MS Office — одна из самых сложных реверс-инжиниринговых задач в работе с документами. Трудность заключается в том, что Microsoft Office использует коммерческие, исторически унаследованные алгоритмы разметки текста (Layout Engine), которые завязаны на поведение системных рендеров Windows (ранее GDI/Uniscribe, сейчас — DirectWrite), а также на специфическое чтение таблиц шрифта TTF/OTF.

Если взять стандартный FreeType или Mac CoreText и попытаться отрендерить ту же строку по метаданным DrawingML, текст «поплывет» уже на втором-третьем слове, из-за чего изменятся точки переноса строк, а финальная картинка не совпадет.

---

## 1. Расчёт межстрочного интервала (Line Spacing) в Office

### Источник: [TeX StackExchange — "How is line spacing usually calculated?"](https://tex.stackexchange.com/questions/79660/how-is-line-spacing-usually-calculated)

**Ключевое открытие:** Office полностью игнорирует стандартные метрики `Ascender` и `Descender` из таблицы шрифта `hhea` (которую по умолчанию используют Apple, Linux и веб-браузеры). Вместо этого Office берёт значения из таблицы **`OS/2`**, а именно параметры **`usWinAscent`** и **`usWinDescent`**.

### Формула коэффициента (Single Line Spacing)

Для каждого шрифта Office рассчитывает индивидуальный множитель высоты строки:

```
LineSpacingMultiplier = (usWinAscent + usWinDescent) / unitsPerEm
```

**Примеры:**
- **SimSun** (`unitsPerEm = 256`, `winAscent = 220`, `winDescent = 36`): множитель = `256 / 256 = 1.0` (плюс внутренний микро-паддинг)
- **Arial / Times New Roman**: множитель ≈ `1.15 – 1.3` от размера шрифта

Если ваш движок посчитает высоту строки как `1.2 * FontSize` (стандарт для InDesign/веба), ваш рендер **никогда** не совпадёт с Office.

---

## 2. Проблема субпиксельного хинтинга и различия платформ

### Источник: [Hacker News — "Office XML document viewer that renders to HTML Canvas"](https://news.ycombinator.com/item?id=42900900) (Июнь 2026)

**Суть:**
- Desktop Office использует **субпиксельное позиционирование глифов**, жёстко привязанное к Windows **DirectWrite API**
- Microsoft 365 (Web-версия) **не является pixel-perfect** по сравнению с десктопным Word/PowerPoint для Windows
- macOS-версия использует другой движок растеризации (CoreText)
- Разница в хинтинге шрифтов на **0.1 пикселя** на системном уровне приводит к тому, что текст в конце длинного абзаца переносится на другую строку

---

## 3. Как получить правильные метрики на уровне кода

### a) Документация Microsoft Typography: [Advanced typographic tables — OpenType Layout](https://learn.microsoft.com/en-us/typography/opentype/ot-overview/)

Порядок, в котором Office обязан преобразовывать символы в пиксели:
1. Рассчитать device-independent (независимые от устройства) точки разрыва строк по таблицам **BASE** и **GPOS**
2. Провести выравнивание (Justify) по таблице **JSTF**
3. Только в последний момент растеризовать глифы в девайс-координаты (пиксели)

### b) Спецификация Microsoft Win32: [Fonts and text metrics](https://learn.microsoft.com/en-us/windows/win32/gdi/fonts-and-text-metrics)

**Dynamic Font Metrics:** Office запрашивает у ОС метрики шрифта во время рендеринга. Если шрифт обновляется системой, Office пересчитывает его `xMin`, `xMax`, `yMin`, `yMax` на лету, что защищает текст от обрезки (clipping), но меняет физические границы текстового блока.

---

## 4. Что НЕЛЬЗЯ использовать (если нужен pixel-perfect)

### ❌ HTML5 Canvas API (`ctx.fillText`, `ctx.measureText`)
- Каждый браузер и ОС рендерят строку через `ctx.fillText` по-разному
- На Mac текст шире из-за CoreText, на Windows — уже
- `ctx.measureText` возвращает метрики с округлением, не позволяющие рассчитать точные точки переноса строк как в Office

### ❌ CSS Layout (`div`, `flexbox`, `white-space: wrap`)
- Алгоритм переноса строк в браузерах (Blink/WebKit) принципиально отличается от MS Office
- Высота строк (`line-height`) в CSS рассчитывается на основе других таблиц шрифта (не `usWinAscent`/`usWinDescent`, а `hhea.Ascender`/`Descender`)

---

## 5. Что ПОМОЖЕТ (рекомендуемый стек для TypeScript)

Необходимо забрать у движка отображения управление каждым пикселем и вычислять координаты вручную.

### a) [opentype.js](https://github.com/opentypejs/opentype.js) — парсинг TTF/OTF
Позволяет загрузить файл шрифта в буфер и даёт полный доступ к:
- Глифам и кривым Безье
- Сырым метрикам (таблицы `OS/2`, `hhea`, `hmtx`)

**Расчёт высоты строки:**
```typescript
const ascent = font.tables.os2.usWinAscent;
const descent = font.tables.os2.usWinDescent;
const unitsPerEm = font.unitsPerEm;
const lineSpacingPx = ((ascent + descent) / unitsPerEm) * fontSize;
```

### b) [fontkit](https://github.com/foliojs/fontkit) (от команды PDFKit)
- Лучше работает с продвинутыми фичами OpenType (лигатуры, подмена глифов)
- Критично для правильного шейпинга текста

### c) [harfbuzzjs](https://github.com/harfbuzz/harfbuzzjs) — font shaping (WebAssembly)
- WebAssembly-порт HarfBuzz (используется в Chromium)
- Передаётся строка Юникода + файл шрифта → возвращает точный массив сдвигов (X/Y advances и offsets) для каждого глифа
- Учитывает кернинг и лигатуры

**Рекомендуемый пайплайн:**
```typescript
1. opentype.js     → загрузить .ttf, прочитать OS/2 (usWinAscent/Descent)
2. harfbuzzjs      → шейпинг текста (лигатуры, кернинг)
3. Свой layout     → line breaking, X/Y positioning по метрикам из (1) + (2)
4. Свой рендер     → SVG <text> + <tspan> или растр
```

### d) [pretext (by chenglou)](https://github.com/chenglou/pretext)
- Лёгкий line breaking engine на основе canvas
- **Не подходит** для pixel-perfect с Office — использует canvas.measureText, дающий другие метрики

---

## Сводная таблица: что брать из шрифта

| Параметр | Таблица | Назначение |
|---|---|---|
| `winAscent`, `winDescent` | `OS/2` | **Line spacing** (Office использует именно их) |
| `ascender`, `descender` | `hhea` | Не использовать — Office игнорирует |
| `unitsPerEm` | `head` | Масштабирование метрик |
| `advanceWidth` | `hmtx` | Ширина глифа |
| `xMin`, `xMax`, `yMin`, `yMax` | `head` / `glyf` | Bounding box |

---

## 6. Fontkit API — доступ к таблицам шрифта

### Источник: [DeepWiki — foliojs/fontkit](https://deepwiki.com/wiki/foliojs/fontkit)

#### Загрузка шрифта
```typescript
import fontkit from 'fontkit';

// Синхронно (Node.js)
const font = fontkit.openSync('path/to/font.ttf');

// Из буфера (для ESM)
const buffer = fs.readFileSync('font.ttf');
const font = fontkit.create(buffer);
```

#### OS/2 таблица — метрики для Office
```typescript
const os2 = font['OS/2'];  // lazy-loaded
if (os2) {
  const winAscent  = os2.usWinAscent;   // 220 для SimSun
  const winDescent = os2.usWinDescent;   // 36 для SimSun
  const typoAscender  = os2.sTypoAscender;
  const typoDescender = os2.sTypoDescender;
  const capHeight     = font.capHeight;  // getter: OS/2 > fallback font.ascent
}
```

#### hhea таблица — стандартные метрики (НЕ Office)
```typescript
const hhea = font.hhea;
console.log(hhea.ascent);   // font.ascent  — getter → this.hhea.ascent
console.log(hhea.descent);  // font.descent — getter → this.hhea.descent
```

#### head таблица
```typescript
console.log(font.unitsPerEm); // из head таблицы
```

#### hmtx таблица — ширина глифов
```typescript
// Получить глиф по символу
const glyph = font.glyphForCodePoint('A'.charCodeAt(0));
if (glyph) {
  console.log(glyph.advanceWidth); // из hmtx
}

// Измерить строку вручную
function measureString(font: any, text: string): number {
  let totalWidth = 0;
  for (const char of text) {
    const glyph = font.glyphForCodePoint(char.charCodeAt(0));
    if (glyph) totalWidth += glyph.advanceWidth;
  }
  return totalWidth;
}
```

#### Формула Office для line spacing (через fontkit)
```typescript
function officeLineSpacingPx(font: any, fontSize: number): number {
  const os2 = font['OS/2'];
  const ascent = os2?.usWinAscent ?? font.ascent;
  const descent = os2?.usWinDescent ?? font.descent;
  const scale = fontSize / font.unitsPerEm;
  return (ascent + descent) * scale;
}

function browserLineSpacingPx(font: any, fontSize: number): number {
  const scale = fontSize / font.unitsPerEm;
  return (font.ascent + font.descent) * scale;
  // ВНИМАНИЕ: font.ascent = hhea.ascent, НЕ OS/2
}
```

---

## 7. Parley архитектура — как это соотносится с нами

### Источник: [DeepWiki — linebender/parley](https://deepwiki.com/wiki/linebender/parley)

У Parley трейтовая архитектура с разделением:

| Компонент Parley | Наш аналог (dev-1.0-parley) |
|---|---|
| `FontContext` (база шрифтов + кэш) | `IFontMetricsProvider` + `FontMetricsProvider` |
| `Brush<B>` (pluggable brush type) | `TextStyleNode.color` (string) |
| `LayoutContext` (ресурсы + состояние) | `ParagraphLayoutEngine` (оркестратор) |
| `ResolveContext` (разрешение стилей) | `DocumentCompiler.compileParagraph()` |
| `ShapeContext` (шейпинг → glyph array) | pretext `prepareRichInline` |
| `Layout::break_all_lines()` (line breaking) | `walkRichInlineLineRanges()` (pretext) |
| `Layout::align()` (позиционирование) | `PositioningEngine.positionLineBoxes()` |

**Ключевая идея Parley** — `FontContext` можно реализовать по-разному через трейты, `LayoutContext` не знает деталей. **У нас уже то же самое** — `IFontMetricsProvider` и `fontMetricsFn` callback.

---

## Ссылки

1. [TeX.SE: "How is line spacing usually calculated?"](https://tex.stackexchange.com/questions/79660/how-is-line-spacing-usually-calculated)
2. [Hacker News: "Office XML document viewer that renders to HTML Canvas" (2026)](https://news.ycombinator.com/item?id=42900900)
3. [Microsoft Learn: OpenType Layout Development](https://learn.microsoft.com/en-us/typography/opentype/ot-overview/)
4. [Microsoft Learn: Fonts and Text Metrics](https://learn.microsoft.com/en-us/windows/win32/gdi/fonts-and-text-metrics)
5. [OpenType.js — GitHub](https://github.com/opentypejs/opentype.js)
6. [Fontkit — GitHub](https://github.com/foliojs/fontkit)
7. [Fontkit DeepWiki](https://deepwiki.com/wiki/foliojs/fontkit)
8. [HarfBuzzJS — GitHub](https://github.com/harfbuzz/harfbuzzjs)
9. [Pretext — GitHub](https://github.com/chenglou/pretext)
10. [Parley DeepWiki](https://deepwiki.com/wiki/linebender/parley)
