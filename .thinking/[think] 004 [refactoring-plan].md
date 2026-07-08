# Plan: Rich Text Layout Engine — Рефакторинг
СПИСОК ЗАВИСИМОСТЕЙ, API И ВОПРОСОВ ПО СБОРКЕ

================================================================================
1. PRETEXT — ПОЛНЫЙ ПУБЛИЧНЫЙ API
================================================================================

Пакет: @chenglou/pretext (v0.0.8, уже установлен)
Импорт: import { ... } from '@chenglou/pretext'
Режим: ESM ("type": "module"), работает без сборщика в Node 22+

--- Основные функции ---

// === Phase 1: Prepare ===
prepare(text: string, font: string, options?: PrepareOptions): PreparedText
prepareWithSegments(text: string, font: string, options?: PrepareOptions): PreparedTextWithSegments

// === Phase 2: Layout (hot path) ===
layout(prepared: PreparedText, maxWidth: number, lineHeight: number): LayoutResult
layoutWithLines(prepared: PreparedTextWithSegments, maxWidth: number, lineHeight: number): LayoutLinesResult

// === Итеративный layout (для обтекания) ===
walkLineRanges(prepared: PreparedText, maxWidth: number, onLine: (range: LayoutLineRange) => void): void
layoutNextLine(prepared: PreparedTextWithSegments, cursor: LayoutCursor, maxWidth: number): LayoutLine | null
measureLineStats(prepared: PreparedTextWithSegments, maxWidth: number): LineStats

// === Cache ===
clearCache(): void
setLocale(locale?: string): void

--- Типы ---

type LayoutResult = { lineCount: number; height: number }
type LayoutLinesResult = LayoutResult & { lines: LayoutLine[] }
type LayoutLine = { text: string; width: number; start: LayoutCursor; end: LayoutCursor }
type LayoutCursor = { segmentIndex: number; graphemeIndex: number }
type LineStats = { lineCount: number; maxLineWidth: number }

type PrepareOptions = {
  whiteSpace?: 'normal' | 'pre-wrap'
  wordBreak?: 'normal' | 'keep-all'
  letterSpacing?: number
}

--- Rich Inline API (для mixed-style текста) ---

Импорт: import { ... } from '@chenglou/pretext/rich-inline'

// Prepare
prepareRichInline(items: RichInlineItem[]): PreparedRichInline
walkRichInlineLineRanges(prepared: PreparedRichInline, maxWidth: number, cb: (range: RichInlineLineRange) => void): void
materializeRichInlineLineRange(prepared: PreparedRichInline, range: RichInlineLineRange): RichInlineLine

// Типы
type RichInlineItem = {
  text: string
  font: string
  letterSpacing?: number
  extraWidth?: number         // padding, border
  break?: 'normal' | 'never'  // для atomic chips
}

type RichInlineLine = {
  fragments: RichInlineFragment[]
  width: number
  end: RichInlineCursor
}

type RichInlineFragment = {
  itemIndex: number     // индекс в оригинальном массиве items
  text: string          // текст фрагмента (может быть частью оригинального text)
  gapBefore: number     // межсловный пробел
  occupiedWidth: number // text width + extraWidth
  start: LayoutCursor
  end: LayoutCursor
}

Важно: RichInlineFragment не содержит per-glyph данных. Только text + occupiedWidth. Glyph-level данные строятся самостоятельно.


================================================================================
2. FONTKIT — ПОЛНЫЙ ПУБЛИЧНЫЙ API
================================================================================

Пакет: fontkit (нужно установить: npm install fontkit)
Импорт: import * as fontkit from 'fontkit' (ESM)
Режим: Поддерживает ESM, CJS, browser. В package.json указаны отдельные entry points.

--- Основные функции ---

// === Создание шрифта ===
fontkit.create(buffer: Buffer, postscriptName?: string): TTFFont
fontkit.open(filename: string, postscriptName?: string): Promise<TTFFont>
fontkit.openSync(filename: string, postscriptName?: string): TTFFont

--- Свойства шрифта ---

interface TTFFont {
  // === Метрики (Units Per Em) ===
  unitsPerEm: number        // размер координатной сетки шрифта
  ascent: number            // подъём в UPM
  descent: number           // спуск в UPM (отрицательное число!)
  capHeight: number         // высота заглавных букв в UPM
  xHeight: number           // высота строчных (x-height) в UPM
  lineGap: number           // межстрочный зазор в UPM
  underlinePosition: number
  underlineThickness: number
  
  // === Дополнительно ===
  familyName: string
  subfamilyName: string
  postscriptName: string
  format: string            // 'truetype', 'opentype', 'woff', 'woff2'
  
  // === Glyph access ===
  glyphsForString(text: string): GlyphRun[]
  getGlyph(glyphId: number): Glyph
}

interface Glyph {
  id: number
  advanceWidth: number      // в UPM
  bbox: { minX: number, minY: number, maxX: number, maxY: number }  // bounding box в UPM
  path: Path                // SVG-like path
  name: string
}

--- Расчёт физических метрик из UPM ---

У fontkit метрики указаны в unitsPerEm (UPM).
Для перевода в px используется формула: scale = fontSize / font.unitsPerEm

const scale = fontSize / font.unitsPerEm
const metrics = {
  ascent: font.ascent * scale,
  descent: Math.abs(font.descent) * scale,
  capHeight: font.capHeight * scale,
  lineGap: font.lineGap * scale,
}


================================================================================
3. NODE CANVAS — ДЛЯ БРАУЗЕРНОГО ФОЛБЕКА
================================================================================

Пакет: canvas (уже установлен, v3.2.3)
Импорт: import { createCanvas } from 'canvas'

Используется для: получения метрик в Node.js, когда fontkit не зарегистрировал шрифт.

import { createCanvas } from 'canvas'

const canvas = createCanvas(1, 1)
const ctx = canvas.getContext('2d')
ctx.font = 'italic bold 16px Inter'
const metrics = ctx.measureText('M')
// metrics.fontBoundingBoxAscent
// metrics.fontBoundingBoxDescent
// metrics.width

Проблема: node-canvas требует системные зависимости (pango, cairo, libjpeg). 
Рекомендация: использовать fontkit как primary, node-canvas только как fallback.


================================================================================
4. БИБЛИОТЕКИ ДЛЯ YAML
================================================================================

Для генерации снепшотов в YAML (шаг 1 плана):

Пакет: js-yaml (нужно установить: npm install js-yaml)
Импорт: import { dump, load } from 'js-yaml'
Назначение: сериализация LineBox -> YAML для читаемых снепшотов

import { dump } from 'js-yaml'

const yaml = dump({
  paragraph: {
    width: 300,
    height: 120.5,
    lines: lines.map(l => ({ y: l.y, width: l.width, fragments: l.fragments }))
  }
}, { indent: 2, lineWidth: 120 })

Альтернатива: пакет 'yaml'. Оба решения поддерживают ESM.


================================================================================
5. ПРОБЛЕМЫ СБОРКИ И ESM
================================================================================

--- Текущая конфигурация проекта ---

- "type": "module" -> ESM (Проблем нет)
- moduleResolution: "bundler" -> Для TS. Ошибка: Не работает с `node --experimental-loader tsx`
- esbuild (devDeps) v0.28 -> Для сборки демки (Проблем нет)
- tsx (devDeps) v4.7 -> Для запуска тестов `npx tsx --test` (Проблем нет)
- vitest (devDeps) v1.3 -> Для тестов (Проблем нет)

--- Известные проблемы и решения ---

1. Проблема: Pretext импортирует из `@chenglou/pretext/rich-inline`
   Решение: Работает корректно. Pretext — это полноценный ESM пакет.

2. Проблема: Fontkit — ESM
   Решение: Работает корректно через `import * as fontkit from 'fontkit'`.

3. Проблема: Node-canvas — CJS (Может конфликтовать)
   Решение: Использовать динамический импорт: `const { createCanvas } = await import('canvas')`

4. Проблема: moduleResolution: "bundler" несовместим с tsx loader.
   Решение: Изменить на "NodeNext" в tsconfig.json.

5. Проблема: Vitest с ESM
   Решение: Поддерживается из коробки.

6. Проблема: Выбор test runner
   Решение: Использовать `npx tsx --test packages/rich-text-core/tests/*.test.ts` или `vitest run`.

--- Рекомендуемые изменения tsconfig.json ---

{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",           // Обновлено с "ESNext"
    "moduleResolution": "NodeNext", // Обновлено с "bundler"
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "sourceMap": true,
    "outDir": "./dist",
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "types": ["node"]
  }
}


================================================================================
6. ПОЛНЫЙ СПИСОК ЗАВИСИМОСТЕЙ (ЧТО НУЖНО УСТАНОВИТЬ)
================================================================================

- @chenglou/pretext     | Установлен (v0.0.8) | Line breaking engine           | Из '@chenglou/pretext' и '/rich-inline'
- canvas (node-canvas)  | Установлен (v3.2.3) | Canvas text metrics fallback   | import { createCanvas } from 'canvas'
- fontkit               | НЕ установлен       | Font metrics из TTF/OTF        | import * as fontkit from 'fontkit'
- js-yaml               | НЕ установлен       | YAML сериализация снепшотов    | import { dump } from 'js-yaml'
- typescript            | Установлен (v5.4)   | Компиляция                     | —
- vitest                | Установлен (v1.3)   | Тесты                          | —
- tsx                   | Установлен (v4.7)   | Запуск TS в Node               | —
- esbuild               | Установлен (v0.28)  | Сборка демки                   | —


================================================================================
7. ВОПРОСЫ, КОТОРЫЕ МОЖНО РЕШИТЬ СЕЙЧАС
================================================================================

Вопрос 1: ESM vs CJS для fontkit
Решение: Fontkit поддерживает ESM. Установка и импорт выполняются стандартно:
  npm install fontkit
  npm install -D @types/fontkit  # Если необходимы типы

Вопрос 2: moduleResolution в tsconfig
Решение: Меняем значение на "NodeNext" для обеспечения полной совместимости с нативным загрузчиком Node.js.

Вопрос 3: YAML библиотека
Решение: Используем 'js-yaml' — проверенная временем, легкая библиотека с поддержкой ESM.

Вопрос 4: Как тестировать?
Решение: 
  - vitest для изолированных модульных тестов (уже настроен).
  - npx tsx --test для сквозных интеграционных тестов.
  - UPDATE_SNAPSHOTS=1 для автоматического обновления YAML-снепшотов.

Вопрос 5: Как получать fontMetrics в браузере?
Решение: Реализовать CanvasFontMetricsProvider, использующий нативный `document.createElement('canvas')`. Метод работает везде без внешних зависимостей.

Вопрос 6: Как получать fontMetrics в Node.js?
Решение: Двухуровневая стратегия:
  1. Primary: `fontkit.create(buffer)` — надежно, быстро, не требует системных библиотек.
  2. Fallback: `node-canvas` (`ctx.measureText()`) — используется для системных шрифтов.


================================================================================
8. ИТОГОВАЯ КАРТА ИМПОРТОВ
================================================================================

FontMetricsProvider.ts
  │
  ├── fontkit.create(buffer)     // Node.js, primary
  ├── createCanvas (node-canvas) // Node.js, fallback
  └── document.createElement     // Browser

ParagraphLayoutEngine.ts
  │
  ├── prepareRichInline()        // @chenglou/pretext/rich-inline
  ├── walkRichInlineLineRanges()
  └── materializeRichInlineLineRange()

LineBoxValidator.ts
  └── Чистый TS (без внешних зависимостей)

SVGRenderer.ts
  └── Чистый TS (без внешних зависимостей)

snapshots (YAML)
  └── dump()                     // js-yaml
## Основание

Документ собран на основе:
- `thinnking.md` — архитектурный манифест (модели, инварианты, тесты)
- `LAYOUT_ENGINE_SPEC.md` — полная спецификация (дополнение от пользователя)
- `context.md` — обсуждение output model и принципов для AI-агента
- DeepWiki по `chenglou/pretext` — полный API reference (100% accuracy, emoji ZWJ, CJK, Bidi)
- Исходники `linebender/parley` — эталонная Rust архитектура (LayoutContext, инварианты)
- Исходники `toptensoftware/richtextkit` — C# реализация (RichString, hit testing)
- Текущий код проекта (`LayoutEngine.ts`, `Document.ts`, `LayoutTypes.ts`)
- Пользовательское дополнение (autofit, justify фрагментированный, SVG `<tspan>`, Parley-принципы)

---

## 1. Анализ текущего состояния

### 1.1 Что есть сейчас

```
packages/rich-text-core/src/
  model/Document.ts       — RichTextDocument, Paragraph, Run, TextStyle
  layout/LayoutEngine.ts   — основной LayoutEngine (pretext rich-inline)
  measure/LayoutTypes.ts   — LaidOutLine, LineRun (output)
  render/SVGRenderer.ts    — SVG рендерер
  render/CanvasRenderer.ts — Canvas рендерер
  render/DebugRenderer.ts  — дебаг визуализация
  measure/canvas-polyfill.ts
  measure/FontkitTextMeasurer.ts
  index.ts                 — public API exports
```

### 1.2 Проблемы текущей архитектуры

| Проблема | Где | Описание |
|----------|-----|----------|
| Нет FontMetricsProvider | LayoutEngine.ts | `fontSize * 0.8` — грубая аппроксимация ascent/descent |
| measureText в layout | LayoutEngine.ts:29-34 | ctx.measureText() вызывается в layout фазе, хотя pretext уже измерил |
| Нет GlyphCluster слоя | отсутствует | Run используется как layout unit → overlap при переносах |
| Нет LineBox контракта | LayoutTypes.ts | LaidOutLine не гарантирует noOverlap |
| Нет PageBox/Pagination | отсутствует | Только плоский массив строк |
| Нет paragraph spacing | LayoutEngine.ts | spaceBefore/spaceAfter не реализованы |
| Нет inline-box поддержки | отсутствует | Нельзя вставить иконку/картинку в текст |
| Нет snapshot-тестов | отсутствуют | Нет YAML семантических снепшотов |
| Render участвует в вычислениях | SVGRenderer.ts | Рендерер сам решает что и где рисовать |
| Нет justify | LayoutEngine.ts | Только left/center/right |
| Нет autofit | отсутствует | Нет пропорционального масштабирования под контейнер |

### 1.3 Что можно удалить/упростить

- **measure/canvas-polyfill.ts** — больше не нужен (measure отделён от layout)
- **measure/FontkitTextMeasurer.ts** — заменить на FontMetricsProvider
- **DebugRenderer.ts** — временно, переписать под новую модель
- **RichTextLayoutEngine.ts** (альтернативный) — если есть, удалить, оставить один

---

## 2. Целевая архитектура

### 2.1 Философия (Parley-inspired)

Движок декомпозирует сложную задачу рендеринга текста на изолированные, слабосвязанные слои:

1. **Авто-масштабирование (Autofit)** — опциональная пре-фаза, пропорционально уменьшает все fontSize, чтобы текст вписался в контейнер.
2. **Арифметика переносов (`pretext`)** — 100% браузерная точность (Unicode-сегментация, CJK, Bidi, Эмодзи ZWJ). Отвечает за горизонтальное разбиение текста на строки и расчет относительных ширин. Не знает про координаты Y, базовые линии и физические метрики шрифтов.
3. **Провайдер метрик (`FontMetricsProvider`)** — изолированный изоморфный слой. Извлекает точные вертикальные метрики (ascent, descent, capHeight) из Canvas или fontkit.
4. **Движок позиционирования (`PositioningEngine`)** — чисто математический слой на TypeScript. Координирует данные от `pretext` и `FontMetricsProvider`, распределяя абсолютные X (выравнивание, инденты) и Y (базовые линии, межстрочные интервалы, отступы абзацев).

### 2.2 Ключевые принципы из Parley

- **Разделение на LayoutContext и Layout:** Тяжёлые операции (чтение бинарных шрифтов, парсинг Unicode, `prepareRichInline`) изолируются и кэшируются.
- **Ленивый перерасчет (Re-linebreaking):** При изменении ширины контейнера (resize) движок не парсит стили заново, а переиспользует PreparedRichInline.
- **InlineBox:** Картинки/иконки интегрируются как атомарные элементы (\uFFFC) с собственной геометрией.

### 2.3 Pipeline (5 фаз + пре-фаза)

```
├─ PRE-FASE — AUTOFIT (опционально, до компиляции)
│  RichTextDocument + maxWidth/maxHeight → scaled RichTextDocument
│  - Бинарный поиск scale (0.0 … 1.0)
│  - temporaryFontSize = originalFontSize * scale
│  - Визуальная пропорция сохраняется (32px → 16px, 14px → 7px при scale=0.5)
│  - Проверка: layout при scale вписывается в maxWidth/maxHeight?
│  - Фиксация уменьшенных fontSize → Phase 1
│
Phase 1 — COMPILE (один раз, тяжёлый)
  RichTextDocument → PreparedRichInlineItem[]
  - ParagraphNode → RichInlineItem для pretext
  - inline-box: текст → \uFFFC, размеры в metadata
  - super/sub: fontSize *= 0.65, baselineOffset в metadata
  - Результат кэшируется по ключу параграфа

Phase 2 — MEASURE (один раз)
  PreparedRichInlineItem[] → FontMetrics (ascent/descent)
  - FontMetricsProvider (Canvas | fontkit)
  - Регистрация шрифтов через registerFont()

Phase 3 — LAYOUT (hot path, pure arithmetic)
  RichInlineItem[] + FontMetrics + maxWidth → ParagraphLayoutResult
  - pretext: prepareRichInline + walkRichInlineLineRanges
  - PositioningEngine: X (alignment, justify) + Y (baseline, spacing)
  - LineBox[] с noOverlap гарантией
  - Justify: фрагментированный подход (каждый пробел → FragmentBox)

Phase 4 — RENDER (тупой)
  LineBox[] → SVG/PDF/Canvas
  - Только рисует, ничего не вычисляет
  - SVG: <text> + <tspan> с xml:space="preserve"
  - Работает с абсолютными координатами
```

### 2.4 Пре-фаза: Пропорциональный Autofit

Если включён режим `autofit: { maxWidth, maxHeight }`:

1. **Бинарный поиск scale** в диапазоне `[0.0, 1.0]`:
   - Для каждого кандидата `scale`:
     - Вычислить `temporaryFontSize = originalFontSize * scale` для каждого `TextRunNode`
     - Скомпилировать и выполнить layout (Phase 1→2→3)
     - Проверить: `result.height <= maxHeight && result.width <= maxWidth`
     - Если да → scale валиден, ищем больше
     - Если нет → scale невалиден, ищем меньше
2. **Фиксация:** как только найден максимальный валидный `scale`:
   - Применить `fontSize *= scale` ко всем `TextRunNode` в документе
   - Передать изменённый документ в Phase 1

**Важно:** Пропорции сохраняются. Если были стили с 32px и 14px, при `scale = 0.5` они станут 16px и 7px — визуальная иерархия не ломается.

### 2.5 Модели данных

#### Вход (Logical level — внешний API)

```typescript
export interface RichTextDocument {
  paragraphs: ParagraphNode[];
  autofit?: {
    maxWidth: number;   // максимальная ширина контейнера (px)
    maxHeight: number;  // максимальная высота контейнера (px)
  };
}

export interface ParagraphNode {
  type: 'paragraph';
  style: {
    alignment: 'left' | 'center' | 'right' | 'justify';
    lineHeight: number;       // множитель (1.2, 1.5)
    spaceBefore: number;      // отступ сверху (px)
    spaceAfter: number;       // отступ снизу (px)
    indent?: number;          // красная строка (px)
  };
  children: TextRunNode[]; 
}

export interface TextRunNode {
  type: 'text' | 'inline-box';
  text: string; // для inline-box: \uFFFC
  style: {
    fontFamily: string;
    fontSize: number;
    fontWeight: 'normal' | 'bold' | number;
    fontStyle: 'normal' | 'italic';
    color: string;
    letterSpacing?: number;
    underline?: boolean;
    strikethrough?: boolean;
    script?: 'normal' | 'sub' | 'super';
  };
  // InlineBox поддержка (Parley-inspired)
  inlineWidget?: {
    width: number;
    height: number;
    baselineOffset?: number;
  };
}
```

#### Компиляция (для pretext)

```typescript
export interface PreparedRichInlineItem {
  text: string;
  font: string;           // токен: "Inter_normal_400_16"
  letterSpacing?: number;
  metadata: {
    originalRunIndex: number;
    style: TextRunNode['style'];
    inlineWidget?: TextRunNode['inlineWidget'];
  };
}
```

#### Выход (Physical Box Model / Layout Tree)

```typescript
export interface ParagraphLayoutResult {
  width: number;
  height: number;             // полная высота абзаца с отступами
  lines: LineBox[];
}

export interface LineBox {
  x: number;                  // абсолютный X в контейнере (alignment + indent)
  y: number;                  // абсолютный Y верхней границы строки
  width: number;              // фактическая ширина контента
  height: number;             // полная высота строки (max фрагментов * lineHeight)
  
  baseline: number;           // смещение baseline от y
  ascent: number;             // макс подъём в строке
  descent: number;            // макс спуск в строке
  
  startIndex: number;         // индекс первого символа в исходном тексте
  endIndex: number;           // индекс последнего символа
  fragments: FragmentBox[];
}

export interface FragmentBox {
  x: number;                  // смещение от LineBox.x
  width: number;              // физическая ширина
  text: string;               // текст (или " " для пробела)
  itemIndex: number;          // ссылка на исходный TextRunNode
  
  fontMetrics: {
    ascent: number;
    descent: number;
    fontSize: number;
  };
  
  style: TextRunNode['style'];
  inlineWidget?: TextRunNode['inlineWidget'];
  glyphAdvances?: number[];   // для посимвольного трекинга/выделения
}
```

### 2.6 Justify — фрагментированный подход

При `text-align: justify` каждый пробел превращается в отдельный `FragmentBox` с растянутой шириной:

```typescript
const spaceFragment: FragmentBox = {
  x: currentX,
  width: standardSpaceWidth + extraSpacePerSpace, // растянутая ширина!
  text: " ",                                       // ровно ОДИН пробел
  itemIndex: parentRunIndex,
  fontMetrics: { ascent, descent, fontSize },
  style: { ...parentRunStyle }
};
```

**Правила:**
- `text` содержит `" "` (строку из одного пробела), не пустую строку, не `&nbsp;`
- `width` увеличивается на `extraSpacePerSpace = delta / spaceCount`
- Координата следующего слова: `x_пробела + width_растянутого_пробела`

### 2.7 SVG — рендеринг через `<tspan>`

```xml
<text x="10" y="50" xml:space="preserve" dominant-baseline="alphabetic">
  <tspan x="10">Justified</tspan>
  <tspan x="85"> </tspan>
  <tspan x="102">text</tspan>
  <tspan x="135"> </tspan>
  <tspan x="152">rendered</tspan>
</text>
```

**Почему это работает:**
- Явное управление координатой `x` для каждого слова и пробела
- Пробел физически присутствует в DOM → копирование текста работает корректно
- `xml:space="preserve"` сохраняет пробелы в разметке
- `dominant-baseline="alphabetic"` — правильное выравнивание по базовой линии

### 2.8 Структура пакета (новая)

```
packages/rich-text-core/src/
  types/
    Document.ts          — RichTextDocument, ParagraphNode, TextRunNode (вход)
    LayoutTypes.ts       — ParagraphLayoutResult, LineBox, FragmentBox (выход)
    FontTypes.ts         — FontMetrics, GlyphData (шрифты)
  compile/
    DocumentCompiler.ts  — RichTextDocument → PreparedRichInlineItem[]
  measure/
    FontMetricsProvider.ts  — изоморфный: Canvas + fontkit
    FontRegistry.ts         — регистрация шрифтов
  layout/
    AutoFitEngine.ts        — пропорциональное масштабирование (бинарный поиск scale)
    PositioningEngine.ts    — X/Y positioning + alignment + justify
    ParagraphLayoutEngine.ts — главный engine (pretext + positioning + compile)
    LineBoxValidator.ts     — invariant checks (noOverlap, index consistency)
  paginate/
    PageEngine.ts           — PageBox generation
    WidowOrphanControl.ts   — контроль widow/orphan
  render/
    SVGRenderer.ts          — LineBox[] → SVG через <tspan>
    CanvasRenderer.ts       — LineBox[] → Canvas
  index.ts                  — public API exports

packages/demo/
  index.html               — демка (переделать под новую модель)
  demo.ts                  — пример использования
```

---

## 3. Пошаговый план реализации

### Шаг 1: Типы и модели (1 день)
**Файлы:** `types/Document.ts`, `types/LayoutTypes.ts`, `types/FontTypes.ts`

- [ ] Написать входные типы: `RichTextDocument`, `ParagraphNode`, `TextRunNode` (inlineWidget, script, autofit)
- [ ] Написать выходные типы: `ParagraphLayoutResult`, `LineBox`, `FragmentBox` (inlineWidget, glyphAdvances)
- [ ] Написать типы для шрифтов: `FontMetrics`, `FontRegistration`, `IFontMetricsProvider`
- [ ] Написать **invariant guard** `assertLineBoxInvariants()`:
  ```typescript
  function assertLineBoxInvariants(lines: LineBox[], originalText: string): void {
    // 1. NO_OVERLAP: lines[i].y + lines[i].height <= lines[i+1].y
    // 2. MONOTONIC_Y: lines[i+1].y > lines[i].y
    // 3. INDEX_CONSIST: sum(endIndex - startIndex) === text.length
    // 4. WIDTH_FIT: line.width <= availableWidth + epsilon
    // 5. BASELINE_EQ: у всех fragments в одной line одинаковый baseline
  }
  ```
- [ ] YAML сериализация для снепшотов:
  ```typescript
  function lineBoxToYAML(lines: LineBox[]): string
  // semantic only: line.y, line.width, fragments[].text, fragments[].x
  // НЕ включать: glyphAdvances, fontMetrics (шум)
  ```

### Шаг 2: FontMetricsProvider (1 день)
**Файлы:** `measure/FontMetricsProvider.ts`, `measure/FontRegistry.ts`

```ts
export interface FontMetrics {
  ascent: number;
  descent: number;
  capHeight: number;
  unitsPerEm: number;
}

export interface IFontMetricsProvider {
  registerFont(family: string, options: { weight?: string; style?: string }, source: string | Buffer): void;
  getMetrics(fontFamily: string, fontSize: number, weight?: string, style?: string): FontMetrics;
}

export class FontMetricsProvider implements IFontMetricsProvider {
  private fontCache = new Map<string, any>();

  public registerFont(family: string, options: { weight?: string; style?: string }, source: string | Buffer) {
    if (typeof fontkit !== 'undefined') {
      const buffer = source instanceof Buffer ? source : Buffer.from(source);
      const font = fontkit.create(buffer);
      const key = `${family}_${options.weight || 'normal'}_${options.style || 'normal'}`;
      this.fontCache.set(key, font);
    }
  }

  public getMetrics(fontFamily: string, fontSize: number, weight = 'normal', style = 'normal'): FontMetrics {
    const key = `${fontFamily}_${weight}_${style}`;
    
    if (this.fontCache.has(key)) {
      const font = this.fontCache.get(key);
      const scale = fontSize / font.unitsPerEm;
      return {
        ascent: font.ascent * scale,
        descent: Math.abs(font.descent) * scale,
        capHeight: font.capHeight * scale,
        unitsPerEm: font.unitsPerEm
      };
    }

    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      ctx.font = `${style} ${weight} ${fontSize}px ${fontFamily}`;
      const metrics = ctx.measureText('M');
      
      return {
        ascent: metrics.fontBoundingBoxAscent || fontSize * 0.85,
        descent: metrics.fontBoundingBoxDescent || fontSize * 0.15,
        capHeight: metrics.actualBoundingBoxAscent || fontSize * 0.7,
        unitsPerEm: 1000
      };
    }

    return { ascent: fontSize * 0.85, descent: fontSize * 0.15, capHeight: fontSize * 0.70, unitsPerEm: 1000 };
  }
}
```
- [ ] Интерфейс `IFontMetricsProvider` (изоморфный)
- [ ] `registerFont(family, options, source)` — регистрация бинарных шрифтов через fontkit
- [ ] `getMetrics(fontFamily, fontSize, weight, style) → FontMetrics`
  - Стратегия 1: fontkit (из зарегистрированного буфера)
  - Стратегия 2: Canvas TextMetrics (браузер)
  - Стратегия 3: Fallback (fontSize * 0.85 / 0.15)
- [ ] Кэширование метрик по ключу `"${family}_${weight}_${style}"`
- [ ] **Тест:** проверить что ascent/descent консистентны для разных fontSize

### Шаг 3: DocumentCompiler (0.5 дня)
**Файлы:** `compile/DocumentCompiler.ts`

- [ ] `compile(paragraph: ParagraphNode): PreparedRichInlineItem[]`
- [ ] Обработка inline-box: текст → `\uFFFC`, размеры в metadata.inlineWidget
- [ ] Обработка super/sub: `fontSize *= 0.65`, `baselineOffset` в metadata
- [ ] Генерация font token: `"${family}_${style}_${weight}_${size}"`
- [ ] **Тест:** число items == число run'ов + inlineWidget метаданные сохраняются

### Шаг 4: AutoFitEngine (1 день)
**Файлы:** `layout/AutoFitEngine.ts`

- [ ] `findScale(doc: RichTextDocument, engine: ParagraphLayoutEngine): number`
- [ ] Бинарный поиск scale в [0.0, 1.0]:
  ```typescript
  let lo = 0.0, hi = 1.0
  while (hi - lo > 0.01) {
    const mid = (lo + hi) / 2
    const scaled = applyScale(doc, mid)
    const result = engine.layout(scaled, maxWidth)
    if (result.height <= maxHeight) lo = mid
    else hi = mid
  }
  return lo
  ```
- [ ] `applyScale(doc: RichTextDocument, scale: number): RichTextDocument`
  - Копия документа с `fontSize *= scale` для каждого TextRunNode
  - inlineWidget размеры НЕ скейлятся (картинки остаются своего размера)
- [ ] **Тест:** проверить что scale=1 не меняет документ, scale=0.5 уменьшает fontSize вдвое
- [ ] **Тест:** проверить что результат height <= maxHeight после autofit

### Шаг 5: PositioningEngine (1.5 дня)
**Файлы:** `layout/PositioningEngine.ts`, `layout/ParagraphLayoutEngine.ts`

**5a. PositioningEngine — чистая математика:**

- [ ] `positionLineBoxes(pretextLines, fontMetrics, paragraphStyle) → LineBox[]`
- [ ] X позиционирование:
  - `left`: x = indent
  - `center`: x = indent + (containerWidth - lineContentWidth) / 2
  - `right`: x = indent + (containerWidth - lineContentWidth)
  - `justify` (фрагментированный подход):
    1. Разбить линию на токены (слова и пробелы)
    2. `delta = containerWidth - lineContentWidth`
    3. `extraSpacePerSpace = delta / spaceCount`
    4. Для каждого пробела: `width = standardSpaceWidth + extraSpacePerSpace`
    5. Каждый пробел → отдельный FragmentBox c `text: " "`
- [ ] `firstLineIndent` для первой строки
- [ ] Y позиционирование:
  - `lineHeight` из paragraph.style (множитель)
  - `baseline = max(ascent)` по всем фрагментам строки
  - `height = (maxAscent + maxDescent) * lineHeight`
  - `spaceBefore`, `spaceAfter`
- [ ] Baseline alignment:
  - SUPER: `baselineOffset = fontSize * -0.4`
  - SUB: `baselineOffset = fontSize * 0.15`
  - Scale: `fontSize * 0.65`
- [ ] InlineBox alignment: выровнять нижний край по baseline, или baselineOffset

**5b. ParagraphLayoutEngine — главный оркестратор:**
- [ ] `layout(paragraph: ParagraphNode, maxWidth: number, fontProvider?: IFontMetricsProvider): ParagraphLayoutResult`
- [ ] 0. Если есть autofit → AutoFitEngine.findScale → применить scale
- [ ] 1. Compile → PreparedRichInlineItem[]
- [ ] 2. prepareRichInline(items)
- [ ] 3. walkRichInlineLineRanges(prepared, maxWidth, cb)
- [ ] 4. materializeRichInlineLineRange → fragments
- [ ] 5. positionLineBoxes → LineBox[]
- [ ] 6. assertLineBoxInvariants
- [ ] Кэширование PreparedRichInline по ключу параграфа (Parley LayoutContext)

### Шаг 6: Тесты (1 день)
**Файлы:** `tests/LayoutEngine.test.ts`, `tests/snapshots/`

- [ ] **Invariant tests:**
  - Index Consistency: сумма длин строк == длине текста
  - Zero Width: `width=0` не падает, разбивает по символам
  - Infinity Width: весь текст в одну строку
  - Baseline Alignment (mixed font sizes): `line.y + line.baseline` константна для всех fragments
  - No Overlap: `line[i+1].y >= line[i].y + line[i].height`
- [ ] **Alignment tests:**
  - left, center, right — проверить xOffset
  - justify — проверить что пробелы растянуты, слова не пересекаются
- [ ] **InlineBox test:**
  - Вставка \uFFFC, проверка ширины и позиции
- [ ] **Super/Sub test:**
  - Проверить fontSize * 0.65 и baselineOffset
- [ ] **Autofit test:**
  - Длинный текст в узком контейнере: проверить что scale < 1
  - Проверить что height <= maxHeight после autofit
  - Проверить что пропорции сохранились (32px → 16px при scale=0.5)
- [ ] **Snapshot tests** (YAML):
  - semantic.yaml: только строки и их тексты
  - metrics.json: числовые метрики для сравнения
  - Обновление: `UPDATE_SNAPSHOTS=1 node --test`
- [ ] **Regression tests** для каждого найденного бага
- [ ] **Тест** с emoji, CJK, mixed блоками

### Шаг 7: Переписать рендереры (0.5 дня)
**Файлы:** `render/SVGRenderer.ts`, `render/CanvasRenderer.ts`

- [ ] Renderer принимает `LineBox[]`, ничего не вычисляет
- [ ] SVG:
  ```xml
  <text x="{line.x}" y="{line.y + line.baseline}" xml:space="preserve" dominant-baseline="alphabetic">
    {line.fragments.map(f => `<tspan x="${line.x + f.x}">${escapeXml(f.text)}</tspan>`)}
  </text>
  ```
- [ ] Canvas: `ctx.fillText(f.text, line.x + f.x, line.y + line.baseline)`
- [ ] Поддержка: color, underline, strikethrough, font style
- [ ] **Удалить старые рендереры**

### Шаг 8: Переделать демку (0.5 дня)
**Файлы:** `packages/demo/`

- [ ] `demo.ts` — пример:
  - Создать RichTextDocument с mixed стилями
  - Запустить ParagraphLayoutEngine
  - Вывести SVG
- [ ] `index.html` — открыть в браузере
- [ ] Показать: left, center, right, justify
- [ ] Показать: mixed fonts, colors, super/sub, inline-box
- [ ] Показать: autofit (текст автоматически уменьшается под контейнер)

### Шаг 9: Страница (0.5 дня, опционально)
- [ ] HTML-страница с редактором
- [ ] Ввод текста + выбор стилей
- [ ] Live preview через SVG

---

## 4. Что удалить (cleanup)

| Файл | Причина |
|------|---------|
| `measure/canvas-polyfill.ts` | Больше не нужен (measure отделён от layout) |
| `measure/FontkitTextMeasurer.ts` | Заменён на FontMetricsProvider |
| `measure/LayoutTypes.ts` (старый) | Заменён на `types/LayoutTypes.ts` |
| `model/Document.ts` (старый) | Заменён на `types/Document.ts` |
| `layout/LayoutEngine.ts` (старый) | Заменён на ParagraphLayoutEngine |
| `layout/RichTextLayoutEngine.ts` | Удалить, если есть |
| `render/DebugRenderer.ts` | Временно убрать |

---

## 5. YAML для снепшотов

```yaml
# semantic.yaml — читаемый снепшот
paragraph:
  width: 300
  height: 120.5
  lines:
    - y: 10
      width: 285
      height: 22.4
      baseline: 18.2
      fragments:
        - text: "Hello "
          x: 0
          width: 45.2
        - text: "world"
          x: 45.2
          width: 38.1
          style: bold
    - y: 32.4
      width: 280
      height: 22.4
      baseline: 18.2
      fragments:
        - text: "This is line two"
          x: 0
          width: 120.5
```

Глифы, fontMetrics, inlineWidget — не включаем. Только семантическая структура.

---

## 6. Инварианты (parley-inspired)

```
1. NO_OVERLAP:    line[i+1].y >= line[i].y + line[i].height
2. MONOTONIC_Y:   line[i+1].y > line[i].y
3. INDEX_CONSIST: sum(line[i].endIndex - line[i].startIndex) == text.length
4. WIDTH_FIT:     line[i].width <= maxWidth + epsilon
5. BASELINE_EQ:   внутри line[i] все fragment'ы имеют одинаковый baseline
6. ZERO_WIDTH:    width=0 не падает, разбивает текст по вертикали
7. INFINITY_WIDTH: весь текст в 1 строку
8. AUTOFIT_HEIGHT: после autofit result.height <= maxHeight (если включён)
9. AUTOFIT_PROPORTION: scale применяется ко всем fontSize одинаково
```

---

## 7. Порядок выполнения (для AI-агента)

```
Шаг 1: Типы + invariant guard + YAML сериализация
Шаг 2: FontMetricsProvider + тесты
Шаг 3: DocumentCompiler + тесты
Шаг 4: AutoFitEngine + тесты
Шаг 5: PositioningEngine + ParagraphLayoutEngine + тесты
Шаг 6: Инвариантные тесты + снепшоты + autofit тесты
Шаг 7: Рендереры (новые)
Шаг 8: Демка
Шаг 9: Cleanup старых файлов
```

Каждый шаг включает:
1. Написать тесты (RED)
2. Реализовать код (GREEN)
3. Проверить инварианты
4. Обновить снепшоты