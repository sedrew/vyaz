# RichText Core API

## Архитектура

```
RichTextDocument (вход)
      │
      ▼
ParagraphLayoutEngine (pretext-based)
      │
      ▼
ParagraphLayoutResult { lines: LineBox[] { fragments: FragmentBox[] } }
      │
      ▼
SVGRenderer / CanvasRenderer
```

**Контракты:**
- **Вход:** `RichTextDocument` — модель документа (paragraphs → children: TextRunNode[] → text + style)
- **Выход:** `ParagraphLayoutResult` — результат layout (width, height, lines: LineBox[] с FragmentBox[])
- **Движок:** `ParagraphLayoutEngine` — использует `@chenglou/pretext/rich-inline`
- **Рендереры:** `renderToSVG`, `renderToCanvas`

---

## RichTextDocument — входная модель

```typescript
interface RichTextDocument {
  paragraphs: ParagraphNode[];
  autofit?: AutofitConfig;
  defaultStyle?: Partial<TextStyleNode>;
}

interface AutofitConfig {
  maxWidth: number;    // максимальная ширина контейнера (px)
  maxHeight: number;   // максимальная высота контейнера (px)
}
```

### ParagraphNode (block-level)

```typescript
interface ParagraphNode {
  type: 'paragraph';
  style: ParagraphStyle;
  children: TextRunNode[];
}

interface ParagraphStyle {
  alignment: TextAlignment;     // 'left' | 'center' | 'right' | 'justify'
  lineHeight: number;           // множитель (1.0, 1.15, 1.5, 2.0)
  spaceBefore: number;          // отступ сверху (px)
  spaceAfter: number;           // отступ снизу (px)
  indent?: number;              // красная строка (px)
  leftIndent?: number;          // левый отступ (px)
  rightIndent?: number;         // правый отступ (px)
}

type TextAlignment = 'left' | 'center' | 'right' | 'justify';
```

### TextRunNode (inline-level)

```typescript
interface TextRunNode {
  type: 'text' | 'inline-box';
  text: string;                 // для inline-box: '\uFFFC' (object replacement character)
  style: TextStyleNode;
  inlineWidget?: InlineWidget;
}

interface TextStyleNode {
  fontFamily: string;           // "Arial", "Times New Roman", "Inter"
  fontSize: number;             // px
  fontWeight: 'normal' | 'bold' | number;
  fontStyle: 'normal' | 'italic';
  color: string;                // "#000000"
  backgroundColor?: string;
  letterSpacing?: number;       // px (0 = default)
  underline?: boolean;
  strikethrough?: boolean;
  script?: 'normal' | 'sub' | 'super';
}

interface InlineWidget {
  width: number;
  height: number;
  baselineOffset?: number;      // смещение от baseline
}
```

### Default values

```typescript
import { DEFAULT_PARAGRAPH_STYLE, DEFAULT_TEXT_STYLE } from 'rich-text-core';

// DEFAULT_PARAGRAPH_STYLE:
// { alignment: 'left', lineHeight: 1.15, spaceBefore: 0, spaceAfter: 0 }

// DEFAULT_TEXT_STYLE:
// { fontFamily: 'Arial', fontSize: 12, fontWeight: 'normal',
//   fontStyle: 'normal', color: '#000000' }
```

### Пример входного документа

```typescript
import type { RichTextDocument } from 'rich-text-core';

const doc: RichTextDocument = {
  paragraphs: [
    {
      type: 'paragraph',
      style: {
        alignment: 'center',
        lineHeight: 1.5,
        spaceBefore: 0,
        spaceAfter: 12,
        indent: 20,
      },
      children: [
        {
          type: 'text',
          text: 'Hello ',
          style: {
            fontFamily: 'Arial',
            fontSize: 24,
            fontWeight: 'bold',
            fontStyle: 'normal',
            color: '#000000',
          },
        },
        {
          type: 'text',
          text: 'World',
          style: {
            fontFamily: 'Arial',
            fontSize: 24,
            fontWeight: 'normal',
            fontStyle: 'italic',
            color: '#333333',
          },
        },
      ],
    },
  ],
  autofit: {
    maxWidth: 612,
    maxHeight: 792,
  },
  defaultStyle: {
    fontFamily: 'Arial',
    fontSize: 12,
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#000000',
  },
};
```

---

## ParagraphLayoutResult — выход движка

```typescript
interface ParagraphLayoutResult {
  width: number;             // ширина параграфа (maxWidth)
  height: number;            // полная высота параграфа с отступами
  lines: LineBox[];
}
```

### LineBox (строка)

```typescript
interface LineBox {
  x: number;                 // абсолютный X в контейнере (с учётом alignment + indent)
  y: number;                 // абсолютный Y верхней границы строки
  width: number;             // ширина контента строки (без выравнивания)
  height: number;            // полная высота строки (max фрагментов × lineHeight)

  baseline: number;          // смещение baseline от y
  ascent: number;            // максимальный подъём в строке
  descent: number;           // максимальный спуск в строке

  startIndex: number;        // индекс первого символа в исходном тексте параграфа
  endIndex: number;          // индекс последнего символа + 1

  fragments: FragmentBox[];  // фрагменты строки
}
```

### FragmentBox (атом рендеринга)

```typescript
interface FragmentBox {
  x: number;                 // смещение от LineBox.x
  width: number;             // физическая ширина фрагмента
  text: string;              // текст фрагмента (или " " для пробела при justify)
  itemIndex: number;         // ссылка на исходный TextRunNode в paragraph.children

  fontMetrics: FragmentFontMetrics;  // физические метрики шрифта
  style: TextStyleNode;              // копия стиля исходного TextRunNode

  inlineWidget?: InlineWidget;       // данные inline-box (если фрагмент — inline-box)
  glyphAdvances?: number[];          // посимвольные advance widths
}

interface FragmentFontMetrics {
  ascent: number;
  descent: number;
  fontSize: number;
}
```

---

## ParagraphLayoutEngine — движок (pretext)

```typescript
import { paragraphLayoutEngine, ParagraphLayoutEngine } from 'rich-text-core';
import type { ParagraphNode, ParagraphLayoutResult } from 'rich-text-core';

// Синглтон:
const result: ParagraphLayoutResult = paragraphLayoutEngine.layout(
  paragraph,
  maxWidth,           // доступная ширина контейнера (px)
  fontProvider?,      // опциональный провайдер метрик
);

// Или создать свой экземпляр:
const engine = new ParagraphLayoutEngine();
const result = engine.layout(paragraph, maxWidth);

// Очистить кэш подготовленных данных:
engine.clearCache();
```

**Pipeline:**
1. `compileParagraph(paragraph)` — преобразование в `PreparedRichInlineItem[]`
2. `prepareRichInline(items)` — измерение и сегментация через pretext (кэшируется по ключу параграфа)
3. `walkRichInlineLineRanges` + `materializeRichInlineLineRange` — разбивка на строки
4. `positionLineBoxes(...)` — позиционирование (выравнивание, baseline)
5. `assertLineBoxInvariants(lines, text, maxWidth)` — валидация инвариантов

- Использует `@chenglou/pretext/rich-inline` под капотом
- **Браузер:** использует `canvas.getContext('2d')` (через `OffscreenCanvas`)
- **Node.js:** использует `node-canvas` polyfill

---

## AutoFitEngine — подбор scale factor

```typescript
import { findScale, applyScale } from 'rich-text-core';
import type { AutoFitOptions, AutoFitResult, RichTextDocument } from 'rich-text-core';

// Найти scale factor, при котором документ влезает в maxWidth × maxHeight:
const result: AutoFitResult = findScale(doc, {
  minScale?: number;       // 0.1 по умолчанию
  tolerance?: number;      // 0.01 по умолчанию
  maxIterations?: number;  // 50 по умолчанию
});

// result.scaleFactor — множитель для всех fontSize в документе
//   1.0 = текст влезает, < 1.0 = нужно уменьшить шрифты

// Применить scale factor к документу (создаёт новый документ):
const scaledDoc: RichTextDocument = applyScale(doc, result.scaleFactor);
```

---

## Шрифтовые типы и провайдер метрик

```typescript
import type { FontMetrics, IFontMetricsProvider, GlyphData } from 'rich-text-core';
import { fontMetricsProvider, FontMetricsProvider } from 'rich-text-core';

interface FontMetrics {
  ascent: number;
  descent: number;
  lineGap: number;
  unitsPerEm: number;
  // ...
}

interface IFontMetricsProvider {
  getMetrics(
    fontFamily: string,
    fontSize: number,
    fontWeight: string,
    fontStyle: string,
  ): FontMetrics;
  getGlyphAdvance(
    fontFamily: string,
    fontSize: number,
    fontWeight: string,
    fontStyle: string,
    char: string,
  ): number;
}

// Синглтон:
const metrics = fontMetricsProvider.getMetrics('Arial', 16, 'bold', 'normal');
```

---

## SVGRenderer

```typescript
import { renderToSVG, renderParagraphToSVG } from 'rich-text-core';
import type { SVGRenderOptions } from 'rich-text-core';

// Рендер всего документа в SVG-строку:
const svg: string = renderToSVG(doc, {
  maxWidth: 612,                    // px
  maxHeight: 792,                   // px
  background?: string;              // CSS-цвет фона
  padding?: number;                 // отступ вокруг контента
  debug?: boolean;                  // показать bounding boxes
});

// Рендер одного параграфа:
const paragraphSvg: string = renderParagraphToSVG(
  result,           // ParagraphLayoutResult
  paragraphIndex,   // номер параграфа
  {
    offsetY?: number;               // смещение по Y
    debug?: boolean;
  },
);
```

**Пример вывода:**
```svg
<svg viewBox="0 0 612 792" xmlns="http://www.w3.org/2000/svg">
  <text x="0" y="0" font-family="Arial" font-size="24">
    <tspan font-weight="bold">Hello </tspan>
    <tspan font-style="italic">World</tspan>
  </text>
</svg>
```

---

## CanvasRenderer

```typescript
import { renderToCanvas } from 'rich-text-core';
import type { CanvasRenderOptions } from 'rich-text-core';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

renderToCanvas(doc, canvas, {
  maxWidth: 612,                    // px
  maxHeight: 792,                   // px
  background?: string;              // CSS-цвет фона
  padding?: number;                 // отступ вокруг контента
  debug?: boolean;                  // показать bounding boxes и baseline
});
```

- Автоматически вычисляет размер canvas по контенту (с отступами)
- Учитывает `devicePixelRatio` (HiDPI/Retina)

---

## Компиляция и утилиты

```typescript
import { compileParagraph, getParagraphText, makeFontToken } from 'rich-text-core';
import type { PreparedRichInlineItem } from 'rich-text-core';

// Компиляция ParagraphNode → PreparedRichInlineItem[]:
const items: PreparedRichInlineItem[] = compileParagraph(paragraph);

// Извлечение полного текста параграфа:
const text: string = getParagraphText(paragraph);

// Создание font token для pretext:
const fontToken: string = makeFontToken('Arial', 'bold', 'italic', 16);
// → "italic bold 16px Arial"
```

---

## Валидация layout

```typescript
import { assertLineBoxInvariants, lineBoxToYAML } from 'rich-text-core';
import type { InvariantError } from 'rich-text-core';

// Проверить инварианты строк:
assertLineBoxInvariants(lines, originalText, maxWidth);
// Бросает ошибку при нарушении:
//  - Текстовая целостность (конкатенация line.text == originalText)
//  - Монотонность Y (baselineY[i+1] > baselineY[i])
//  - Ширина (line.totalWidth <= maxWidth)

// Экспорт в YAML (для снапшотов):
const yaml: string = lineBoxToYAML(lines);
```

---

## Быстрый старт

```typescript
import { paragraphLayoutEngine, renderToSVG } from 'rich-text-core';
import type { RichTextDocument } from 'rich-text-core';

const doc: RichTextDocument = {
  paragraphs: [
    {
      type: 'paragraph',
      style: {
        alignment: 'left',
        lineHeight: 1.15,
        spaceBefore: 0,
        spaceAfter: 0,
      },
      children: [
        {
          type: 'text',
          text: 'Hello World',
          style: {
            fontFamily: 'Arial',
            fontSize: 24,
            fontWeight: 'bold',
            fontStyle: 'normal',
            color: '#000000',
          },
        },
      ],
    },
  ],
};

// Layout каждого параграфа:
for (const paragraph of doc.paragraphs) {
  const result = paragraphLayoutEngine.layout(paragraph, 468);
  console.log(`Высота: ${result.height}px, строк: ${result.lines.length}`);
}

// Рендер в SVG:
const svg = renderToSVG(doc, { maxWidth: 468, maxHeight: 600 });
console.log(svg);
```

---

## Публичный API (экспортируемые символы)

### Типы (type-only экспорт)

**Модель документа:**
- `RichTextDocument`, `ParagraphNode`, `ParagraphStyle`
- `TextRunNode`, `TextStyleNode`, `InlineWidget`
- `AutofitConfig`, `TextAlignment`
- `DEFAULT_PARAGRAPH_STYLE`, `DEFAULT_TEXT_STYLE` (константы)

**Выходные типы layout:**
- `ParagraphLayoutResult`, `LineBox`, `FragmentBox`
- `FragmentFontMetrics`
- `SemanticParagraph`, `SemanticLine`, `SemanticFragment`

**Шрифтовые типы:**
- `FontMetrics`, `IFontMetricsProvider`, `GlyphData`

**Опции рендера:**
- `SVGRenderOptions`, `CanvasRenderOptions`

**Опции autofit:**
- `AutoFitOptions`, `AutoFitResult`

**Типы компилятора:**
- `PreparedRichInlineItem`

**Типы валидации:**
- `InvariantError`

### Функции и классы

| Символ | Назначение |
|--------|-----------|
| `ParagraphLayoutEngine` | Основной layout engine (pretext) |
| `paragraphLayoutEngine` | Синглтон ParagraphLayoutEngine |
| `compileParagraph(para)` | Компиляция ParagraphNode → PreparedRichInlineItem[] |
| `getParagraphText(para)` | Извлечение полного текста параграфа |
| `makeFontToken(family, weight, style, size)` | Создание font token для pretext |
| `positionLineBoxes(lines, items, metricsFn, style, maxWidth)` | Позиционирование строк |
| `assertLineBoxInvariants(lines, text, maxWidth)` | Валидация инвариантов строк |
| `lineBoxToYAML(lines)` | Экспорт строк в YAML |
| `findScale(doc, opts?)` | Подбор scale factor для autofit |
| `applyScale(doc, scale)` | Применение scale factor к документу |
| `renderToSVG(doc, opts)` | Рендер документа в SVG-строку |
| `renderParagraphToSVG(result, index, opts?)` | Рендер одного параграфа в SVG |
| `renderToCanvas(doc, canvas, opts)` | Рендер документа на HTML Canvas |
| `FontMetricsProvider` | Провайдер метрик шрифта (fontkit) |
| `fontMetricsProvider` | Синглтон FontMetricsProvider |