# Пробелы в разных режимах: browser (CSS) vs office (OOXML)

## Обзор

Пробелы — один из ключевых аспектов, в котором CSS и OOXML/OpenType расходятся.
Проект поддерживает два режима (`mode: 'browser' | 'office'`), и пробелы должны
вести себя по-разному в зависимости от режима.

---

## 1. Схлопывание пробелов (white-space collapsing)

| Аспект | CSS (browser mode) | OOXML (office mode) |
|--------|--------------------|---------------------|
 | Спецификация | CSS Text Module Level 3 (white-space) | ISO/IEC 29500 / OpenType |
 | Несколько пробелов подряд | Схлопываются в один (по умолчанию `normal`) | Сохраняются как отдельные символы, каждый имеет ширину из hmtx |
 | Пробелы в начале строки | Игнорируются (trim) | Сохраняются, могут свисать за край |
 | Пробелы в конце строки | Нулевая ширина (drop spaces) | Выносятся за край (overflow) |
 | NBSP (U+00A0) | Не схлопывается, не разрывает строку | Не разрывает строку |
 | Табуляция (U+0009) | Схлопывается/пропускается | Фиксированная ширина (tab stop) |

В `white-space: pre-wrap` поведение CSS приближается к OOXML — все пробелы
сохраняются. Разница остаётся только в trailing whitespace (drop vs overflow).

**В проекте:** сейчас не реализовано схлопывание. Pretext умеет, но мы не
используем `SegmentBreakKind.Collapsible`. Нужно будет добавить при переходе
на `white-space: normal`.

---

## 2. Trailing whitespace (концевые пробелы)

| Аспект | CSS (browser) | OOXML (office) |
|--------|---------------|----------------|
 | Спецификация | CSS Text §4.1.3 "Tracking and Dropping Spaces" | ISO/IEC 29500 + LineServices |
 | Ширина | Нулевая для расчёта advance строки | Полная ширина, но вынесена за край |
 | Участие в justify | Не участвует | Не участвует |
 | Визуальное отображение | Не видны | Видны, если выходят за границу текстового поля |
 | Позиционирование | Не влияют на x-offset следующей строки | "Свисают" (hanging) за правый край |

**Parley:** `LineItemData::has_trailing_whitespace` — флаг, trailing whitespace
исключается из advance строки. Не рендерится.

**RichTextKit:** `FontRunKind.TrailingWhitespace` — отдельный run, не рендерится
(`if (RunKind == FontRunKind.TrailingWhitespace) return;`).

**В проекте:** реализовано через `FragmentBox.trailing = true` + вычитание
`trailingWidth` из `effectiveLineWidth`. Пока trailing пробелы ведут себя
как CSS-режим (нулевая ширина). Для Office-режима нужно будет добавлять
hanging overflow.

---

## 3. Justify и пробелы

| Аспект | CSS (browser) | OOXML (office) |
|--------|---------------|----------------|
 | Спецификация | CSS Text Module Level 4 (text-justify) | ISO/IEC 29500 + LineServices |
 | Алгоритм | inter-word (между словами) | inter-word (межсловные интервалы) |
 | Какие пробелы растягиваются | U+0020 только | U+0020 только |
 | NBSP при justify | Не растягивается | Не растягивается |
 | Trailing whitespace при justify | Не участвует (нулевая ширина) | Не участвует (overflow) |
 | Последняя строка | Не justify (text-align-last: auto → start) | Не justify (жёстко, ISO 29500) |
 | Распределение | Равномерно между всеми пробелами | Равномерно между всеми пробелами |
 | Undo | Не требуется (не мутирует данные) | Мутация advance → нужен `unjustify()` |

**Parley:** мутирует `ClusterData::advance` у пробельных кластеров. Есть
`unjustify()` для отката. Исключает последнюю строку (`BreakReason::None`
или `Explicit`).

**RichTextKit:** Justify **не реализован** — только Left/Right/Center.

**В проекте:** реализовано в `PositioningEngine.ts`. Justify распределяет
`slack` между `text === ' ' && !trailing` пробелами. Последняя строка
исключается.

---

## 4. Табуляция

| Аспект | CSS (browser) | OOXML (office) |
|--------|---------------|----------------|
 | Поведение | Не поддерживается в plain text | Поддерживается (tab stops) |
 | Ширина | Нет стандарта | Зависит от табуляторов (a:tabLst в PPT) |
 | Разрыв строки | Нет | Нет |

**В проекте:** не реализовано. Для Office-режима нужно поддерживать tab stops.

---

## 5. Soft hyphen (SHY, U+00AD)

| Аспект | CSS (browser) | OOXML (office) |
|--------|---------------|----------------|
 | Поведение | Перенос + отображение дефиса на месте разрыва | Перенос + отображение дефиса |
 | Ширина дефиса | Добавляется только при разрыве | Добавляется только при разрыве |
 | Без разрыва | Невидим, нулевой ширины | Невидим, нулевой ширины |

**Pretext:** поддерживает `SegmentBreakKind.SoftHyphen` + `discretionaryHyphenWidth`.

**Parley:** не поддерживает (TODO в коде).

**В проекте:** не реализовано. Через pretext можно включить.

---

## 6. Пробелы между runs (межстилевые пробелы)

| Сценарий | Проблема |
|----------|----------|
 | `"Hello<bold> World</bold>"` | Пробел — часть второго run, стиль bold |
 | `"<bold>Hello </bold>World"` | Пробел — часть первого run, стиль bold |
 | `"Hello<italic> </italic>World"` | Пробел — отдельный run, стиль italic |
 | gapBefore от pretext | Пробел привязан к itemIndex следующего фрагмента |

**Parley и RichTextKit:** Пробел всегда принадлежит одному из runs (не бывает
"межстилевого" пробела как отдельной сущности). При split runs пробел
попадает в один из кусков.

**В проекте:** при `gapBefore > 0` создаётся отдельный `FragmentBox` с типом
`'space'`. `itemIndex` берётся от следующего текстового фрагмента. Для justify
это не имеет значения — мы просто увеличиваем `width`. Для рендеринга —
стиль пробела не важен (пробел не отрисовывается как глиф в SVG-режиме).
Для Canvas-режима с glyph-rendering может понадобиться стиль от предыдущего
run.

---

## 7. Zero-width spaces и соединители

| Символ | Название | Поведение |
|--------|----------|-----------|
 | U+200B | ZWSP — zero-width space | Разрешает разрыв строки, нулевой ширины |
 | U+2060 | WJ — word joiner | Запрещает разрыв, нулевой ширины |
 | U+FEFF | ZWNBSP — zero-width no-break space | То же что WJ (deprecated) |

**Pretext:** поддерживает как `SegmentBreakKind.ZeroWidthBreak`.

**В проекте:** не требуется отдельной обработки — pretext уже умеет.

---

## 8. Режимы white-space в CSS

| Режим | Схлопывание | Перенос | Trailing trim | Leading trim |
|-------|-------------|---------|---------------|--------------|
 | `normal` | ✅ | ✅ | ✅ | ✅ |
 | `nowrap` | ✅ | ❌ | ✅ | ✅ |
 | `pre` | ❌ | ❌ | ❌ | ❌ |
 | `pre-wrap` | ❌ | ✅ | ❌ | ❌ |
 | `pre-line` | ✅ | ✅ | ❌ | ❌ |
 | `break-spaces` | ❌ | ✅ + принудительный | ❌ | ❌ |

**В проекте:** используется `pre-wrap` через pretext (сохранение пробелов).
Для browser-режима нужно будет добавить `normal`.

---

## 9. Итог: что и когда делать

```
Phase 1 (сделано):
  trailing: boolean — маркер концевых пробелов
  trailingWidth вычитается из effectiveLineWidth
  justify: исключает последнюю строку и trailing пробелы

Phase 2 (bidi):
  Start/End alignment для RTL
  Итерация пробелов в RTL-направлении для justify (как Parley)

Phase 3 (office mode):
  Trailing whitespace overflow (hanging), а не zero-width
  Tab stops

Phase 4 (white-space collapsing):
  Добавить white-space: normal через типы сегментов pretext
  Схлопывание последовательных пробелов
  Soft hyphen поддержка

Phase 5 (undo):
  Сохранять оригинальные width перед justify (как Parley unjustify)