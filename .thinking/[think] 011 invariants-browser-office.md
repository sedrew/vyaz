# Инварианты: Browser vs Office

Легенда:
- ✅ = реализовано
- ⚠️ = частично (есть баги или не все случаи)
- ❌ = не реализовано
- 🔄 = поведение **различается** между режимами

---

## 1. Общие инварианты (должны работать в обоих режимах)

| # | Инвариант | Статус | Пояснение |
|---|-----------|--------|-----------|
| 1 | **Текстовая целостность**: `sum(line.endIndex - line.startIndex) === originalText.length` | ✅ | Ни один символ не пропадает и не дублируется |
| 2 | **Монотонность Y**: `line[i+1].y >= line[i].y` | ✅ | Строки идут сверху вниз, не перескакивают |
| 3 | **No overlap**: `line[i+1].y >= line[i].y + line[i].height` | ⚠️ | Гарантировано для однострочных, но при mixed font sizes может быть наложение из-за неверного baseline расчёта |
| 4 | **Width fit**: `line[i].width <= maxWidth` (с epsilon) | ✅ | Строка не вылезает за пределы контейнера (при wrap=true) |
| 5 | **Baseline intra-line**: все фрагменты в одной строке рисуются на одном baseline | ⚠️ | Работает для одинаковых font sizes, но при супер/субскрипт может разъезжаться |
| 6 | **Fragment ordering**: фрагменты в строке идут в порядке исходного текста | ✅ | LTR — слева направо |
| 7 | **Zero-width container**: width=0 не падает, текст уходит в вертикаль | ✅ | |
| 8 | **Infinite-width container**: весь текст в одну строку | ✅ | |
| 9 | **Justify не ломает текст**: только растягивает пробелы, текст остаётся тем же | ✅ | |

---

## 2. Инварианты, которые **меняются** между режимами

| # | Инвариант | Browser | Office | Статус |
|---|-----------|---------|--------|--------|
| 10 | **Line height calculation** | `hhea.ascender + hhea.descender` (CSS) | `OS/2.usWinAscent + usWinDescent` + line gap | ⚠️ `FontMetricsProvider` уже умеет переключать `sourceTable`, но нужно везде прокидывать mode |
| 11 | **Trailing whitespace width** | Нулевая (drop spaces) | Полная ширина, вынесена за край (hanging overflow) | ⚠️ Сейчас всегда CSS-поведение (trailingWidth вычитается) |
| 12 | **Trailing whitespace visibility** | Не рендерится | Рендерится (overflow) | ⚠️ То же — нужно для office режима делать hanging |
| 13 | **Justify + trailing whitespace** | Trailing не участвует | Trailing не участвует (совпадает) | ✅ |
| 14 | **Justify + last line** | Не justify (text-align-last: auto → start) | Не justify | ✅ |
| 15 | **White-space collapsing** | `normal` — схлопывание последовательных пробелов, trim leading/trailing | `pre-wrap` — все пробелы сохраняются | ❌ Пока всё в pre-wrap, collapsing не реализован |
| 16 | **Tab-stops** | Нет поведения | Фиксированная ширина табуляции | ❌ Не реализовано |
| 17 | **Soft-hyphen** (U+00AD) | Перенос + дефис | Перенос + дефис (совпадает) | ❌ Не реализовано |
| 18 | **Ascent/Descent выбор** | `hhea` таблица | `OS/2` таблица + `lineGap` добавка | ⚠️ `FontMetricsProvider` умеет, но line gap factor (1.078 для Arial) не везде учтён |

---

## 3. Инварианты только для browser (CSS-specific)

| # | Инвариант | Статус |
|---|-----------|--------|
| 19 | **Collapsing**: `"hello    world"` → `"hello world"` (один пробел) | ❌ |
| 20 | **Leading whitespace trim**: пробелы в начале строки игнорируются | ❌ |
| 21 | **Trailing whitespace drop**: концевые пробелы — нулевой ширины | ⚠️ (реализовано, но для всех режимов) |
| 22 | **End alignment для RTL**: при `direction: rtl` start/end меняются местами | ❌ (Bidi не реализован) |
| 23 | **Text-indent влияет только на первую строку** | ✅ (через ParagraphStyle.indent) |

---

## 4. Инварианты только для office (OOXML-specific)

| # | Инвариант | Статус |
|---|-----------|--------|
| 24 | **Tab-stops**: символ табуляции имеет фиксированную ширину, определённую в параграфе | ❌ |
| 25 | **Hanging overflow**: trailing whitespace выносится за правый край контейнера | ❌ |
| 26 | **OS/2 metrics**: line height считается через `usWinAscent + usWinDescent + lineGap` | ⚠️ (FontMetricsProvider умеет, но не везде) |
| 27 | **Line gap factor**: добавка ~1.078× к высоте строки (PowerPoint "Single" line spacing) | ❌ (нет в коде) |
| 28 | **Unjustify**: после justify сохранять оригинальные advance для возможности отката | ❌ |

---

## 5. Что это значит для разработки

Расклад по статусу:

```
✅ Готово:   1, 2(частично), 4, 6, 7, 8, 9, 13, 14
⚠️ Частично: 2(no overlap), 5(baseline), 10(line height mode), 11, 12, 18, 21, 26
❌ Не готово: 15(collapsing), 16(tabs), 17(soft-hyphen), 19, 20, 22(bidi), 24, 25, 27, 28
```

### Browser mode — ближайшие шаги (priority)

1. **White-space collapsing** (15, 19, 20) — самый заметный баг vs CSS. Без этого текст с лишними пробелами выглядит не по-браузерному.
2. **Baseline intra-line** (5) — смешанные font sizes сейчас могут давать разный baseline внутри строки
3. **No overlap guarantee** (3) — поймать кейсы, где строки наезжают друг на друга
4. **Soft-hyphen** (17) — для переносов

### Office mode — ближайшие шаги (priority)

1. **OS/2 metrics + line gap** (10, 26, 27) — базовое расхождение с PowerPoint. Без этого line height не совпадает никогда.
2. **Trailing whitespace hanging** (11, 12, 25) — концевые пробелы должны выноситься за край, а не быть zero-width
3. **Tab-stops** (16, 24) — офисный стандарт
4. **Justify + unjustify** (28) — для возможности отката изменений

### Общее (нужно обоим режимам)

- **Bidi** (22) — RTL-тексты, арабский, иврит
- **Soft-hyphen** (17)
- **Multi-column** — новая функциональность

---

## 6. Что можно реализовать с текущими библиотеками

### Pretext (`@chenglou/pretext / rich-inline`) — уже есть

| Возможность | Инварианты | Как сделать |
|-------------|-----------|-------------|
| **White-space collapsing** | 15, 19, 20 | `PrepareOptions { whiteSpace: 'normal' }` — библиотека сама схлопнет последовательные пробелы и обрежет leading/trailing |
| **Soft-hyphen** (SHY U+00AD) | 17 | Pretext поддерживает `SegmentBreakKind.SoftHyphen` + `discretionaryHyphenWidth`. Нужно передать параметр в prepare. |
| **Bidi** | 22 | Pretext использует ICU под капотом — нужна проверка, есть ли поддержка RTL. Если нет — потребуется отдельный bidi-алгоритм (UAX#9). |

### Fontkit — уже есть

| Возможность | Инварианты | Как сделать |
|-------------|-----------|-------------|
| **OS/2.usWinAscent/usWinDescent** | 10, 18, 26 | `font['OS/2'].usWinAscent` — уже частично реализовано в `FontMetricsProvider` через `setMode('office')` |
| **hhea.ascender/descender** | 10 | `font.ascent` / `font.descent` — используется в browser mode |
| **hhea.lineGap** | 27 | `font.lineGap` — даёт коэффициент ~1.078× для Arial. Формула: `totalLineHeight = (winAscent + \|winDescent\| + lineGap) * scale` |
| **hmtx.advanceWidth** | — | `glyph.advanceWidth` — уже используется для измерения ширины |
| **GPOS kerning** | — | ❌ **Нет**. Fontkit не поддерживает GPOS. Нужен opentype.js. |

### Opentype.js (нужно установить)

| Возможность | Инварианты | Как сделать |
|-------------|-----------|-------------|
| **GPOS kerning** | — (точность) | `font.getKerningValue(leftGlyph, rightGlyph)` — даёт точный кернинг для advance |
| **GSUB ligatures** | — (точность) | `font.stringToGlyphs('fi')` → лигатура 'ﬁ' |

---

## 7. План реализации по фазам

### Phase A — Browser mode (минимум кода, максимум эффекта)

```
1. Pretext whiteSpace: 'normal'      → collapsing, leading/trailing trim (15, 19, 20)
2. PositioningEngine: baseline fix    → no overlap (3), baseline intra-line (5)
3. Pretext soft-hyphen                → SHY (17)
```

### Phase B — Office mode (режимные расхождения)

```
1. FontMetricsProvider mode прокинуть → OS/2 metrics (10, 26)
2. lineGap в lineHeight формулу       → line gap factor (27)
3. PositioningEngine: не вычитать     → trailing hanging (11, 12, 25)
   trailing при office mode
4. Компиляция табуляции               → tab-stops (24)
```

### Phase C — Точность (опционально)

```
1. Opentype.js для GPOS кернинга     → точные advance ширины
2. Opentype.js для GSUB лигатур      → лигатуры 'fi', 'fl' и т.д.
```

### Phase D — Сложное (требует исследования)

```
1. Bidi / RTL поддержка               → арабский, иврит (22)
2. Unjustify (save original widths)   → откат justify (28)
3. Multi-column layout                 → новая функциональность
```

---

## 8. Языки/скрипты для тестирования

### 1. Latin (English, French, German, Spanish)

```
Hello World! Élysée, über, señor, München, ça va?
```

**Особенности:**
- LTR, alphabetic baseline
- Пробелы U+0020 — основные word separators
- Акценты (é, ü, ñ) — combining marks над символами
- Line break — только по пробелам и дефисам (U+002D)
- Кернинг: AV, To, Wa — важно для advance width

### 2. Cyrillic (Russian, Ukrainian, Bulgarian)

```
Привет всем! Щастя, їхати, здрасти
```

**Особенности:**
- LTR, alphabetic baseline
- Почти как Latin, но другая hmtx таблица
- Есть кириллические буквы с диакритикой (ё, ї, ў)
- Есть буквы, которых нет в латинице (ъ, ы, э)
- Line break — как латиница, по пробелам

### 3. CJK — Chinese, Japanese, Korean

```
你好世界！こんにちは。안녕하세요
```

**Особенности:**
- **Нет пробелов между словами** — break anywhere по глифам
- **Baseline** — центральный (средняя строка CJK glyph), не alphabetic
- **Fullwidth glyphs** — каждый символ занимает квадрат
- **Vertical writing** — традиционно пишутся сверху вниз
- **Punctuation** — своя (。、！「」【】), может быть hanging
- **CJK ideographic space** U+3000 — полноширинный пробел
- **Latin внутри CJK** — узкий (halfwidth), CJK широкий

**Подгруппы:**
- **Chinese (Han)**: 汉字 — логограммы, каждый символ = слово
- **Japanese**: 漢字 + ひらがな + カタカナ — три скрипта в одном тексте
- **Korean (Hangul)**: 한글 — слоговой алфавит, ближе к Latin по поведению

### 4. Arabic / Persian / Urdu

```
مرحباً بالعالم! السلام عليكم
```

**Особенности:**
- **RTL** — текст пишется справа налево
- **Cursive** — буквы соединяются внутри слова (contextual shaping)
- **Initial/Medial/Final positional forms** — одна буква имеет 4 формы
- **Baseline** — alphabetic (но отличается от Latin)
- **Line break** — по пробелам внутри слов
- **Digits** — арабские цифры (٠١٢٣) vs Eastern Arabic (۰۱۲۳)
- **Latin цифры внутри RTL** — пишутся LTR (bidi)

### 5. Devanagari (Hindi, Sanskrit, Marathi)

```
नमस्ते दुनिया! संस्कृतम्
```

**Особенности:**
- **LTR**, но **headline baseline** (сверху есть характерная линия शिरोरेखा)
- **Stacked conjuncts** — क + ् + त → क्त (три символа → один кластер)
- **Vowel signs** — гласные пишутся слева/справа/сверху/снизу от согласной
- **Reph** — र् в начале кластера поднимается наверх
- **Line break** — не по пробелам, а по syllable boundaries
- Разница между `glyph.advanceWidth` и реальной шириной кластера

### 6. Thai / Lao

```
สวัสดีชาวโลก! ສະບາຍດີ
```

**Особенности:**
- **LTR**, alphabetic baseline
- **Нет пробелов между словами** — break по syllable boundaries (сложно)
- **Stacked diacritics** — до 3 уровней над/под буквой (тоновые маркеры)
- **Upper/lower vowels** — гласные стоят над/под согласной
- **Line break rules** — свои, отличные от CJK и Latin
- **Complex shaping** — не все глифы имеют advance (нулевые combining marks)

### 7. Hebrew / Yiddish

```
שָׁלוֹם עֲלֵיכֶם!
```

**Особенности:**
- **RTL**, alphabetic baseline
- **Nikkud (diacritics)** — огласовки под/над буквами
- **Final forms** — некоторые буквы меняют форму в конце слова (ם, ך, ץ)
- **Line break** — по пробелам как Arabic
- **Bidi** — часто смешивается с латиницей

---

### Сводная таблица

| Скрипт | Direction | Baseline | Word separation | Complex shaping | Vertical support |
|--------|-----------|----------|----------------|----------------|------------------|
| Latin | LTR | Alphabetic | Spaces (U+0020) | Кернинг (GPOS) | Поворот 90° |
| Cyrillic | LTR | Alphabetic | Spaces | ❌ | Поворот 90° |
| CJK | LTR/TTB | Central/Idiographic | Break anywhere | Лигатуры | ✅ Native |
| Arabic | RTL | Alphabetic | Spaces | ✅ Contextual | ❌ |
| Devanagari | LTR | Hanging | Syllable | ✅ Conjuncts | ❌ |
| Thai | LTR | Alphabetic | Syllable | ✅ Stacked | ❌ |
| Hebrew | RTL | Alphabetic | Spaces | Final forms | ❌ |

---

### Что ломается в движке на разных скриптах

| Проблема | Скрипты |
|----------|---------|
| **Line break не по space** | CJK, Thai, Devanagari — нужны ICU/Unicode break rules |
| **Bidi (RTL + LTR mixed)** | Arabic + English, Hebrew + Russian — нужен UAX#9 |
| **Кластер ≠ 1 char** | Devanagari (conjuncts), Thai (vowels) — pretext должен уметь |
| **Baseline разный** | CJK (central) vs Latin (alphabetic) — в одной строке разная Y |
| **Contextual shaping** | Arabic (initial/medial/final) — нужен OpenType shaper |
| **Hanging punctuation** | CJK (「」в начале/конце строки) |
| **Final form selection** | Hebrew, Arabic — буква зависит от позиции в слове |
| **Zero-width combining marks** | Thai, Devanagari — marks с advance=0, но занимают место по Y |

---

Pretext уже обрабатывает кластеры правильно (ICU-based). Главные проблемы для нас:

1. **CJK line break** — pretext умеет (break anywhere)
2. **Thai line break** — ❌, нужен ICU word break (pretext может не уметь)
3. **Arabic shaping** — ❌, нужен harfbuzz или opentype.js
4. **Bidi** — ❌, нужно реализовать

Для тестов достаточно 4 скриптов: **Latin (EN)**, **CJK (JP/CN)**, **Arabic**, **Devanagari** — они покрывают основные расхождения.
