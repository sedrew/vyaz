Вот готовый концептуальный архитектурный манифест (LAYOUT_ENGINE_SPEC.md). Этот файл собран так, чтобы ИИ-агент или разработчик мог использовать его как пошаговое руководство к действию: от проектирования типов до написания тестов и интеграции шрифтов.

Markdown
# Архитектурная Спецификация Кастомного Текстового Движка (Layout Engine)

Настоящий документ описывает архитектуру, модели данных, инварианты и стратегию тестирования для кастомного движка верстки многострочного форматированного текста (Rich Text Layout Engine) на базе библиотеки `pretext`.

## 📌 1. Философия и Концепция Системы

Движок разделяет сложную задачу рендеринга текста на изолированные слои:
1. **Арифметика переносов (`pretext`)** — 100% браузерная точность, расчет диапазонов строк и относительных ширин. Не знает ничего про координаты `Y`, базовые линии и метрики шрифтов.
2. **Провайдер метрик (`FontMetricsProvider`)** — абстракция над источником данных о шрифтах (Canvas на клиенте или `fontkit` / `opentype.js` на сервере).
3. **Движок позиционирования (`PositioningEngine`)** — чисто математический слой на TypeScript, распределяющий `X` (выравнивание) и `Y` (базовые линии, отступы абзацев) на основе данных первых двух слоев.

---

## 📐 2. Input и Output Модели Данных

### 📥 Входные модели (Внешний слой и Слой Компиляции)

Логический документ (`RichTextDocument`) представляет собой дерево, удобное для редактора или JSON-хранилища. Перед передачей в `pretext` он разворачивается в плоский массив `RichInlineItem`.

```typescript
// --- Логический уровень (Внешний API) ---
export interface RichTextDocument {
  paragraphs: ParagraphNode[];
}

export interface ParagraphNode {
  type: 'paragraph';
  style: {
    alignment: 'left' | 'center' | 'right' | 'justify';
    lineHeight: number;       // Множитель (например, 1.2 или 1.5)
    spaceBefore: number;      // Отступ сверху абзаца (px)
    spaceAfter: number;       // Отступ снизу абзаца (px)
    indent?: number;          // Абзацный отступ (красная строка)
  };
  children: TextRunNode[]; 
}

export interface TextRunNode {
  type: 'text' | 'inline-box';
  text: string; // Для 'inline-box' здесь пустая строка или специальный заполнитель
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
  // Параметры для встраиваемых объектов (иконки, картинки), вдохновлено Parley
  inlineWidget?: {
    width: number;
    height: number;
  };
}

// --- Компиляционный уровень (Вход для pretext) ---
export interface PreparedRichInlineItem {
  text: string;
  font: string; // Уникальный токен-хэш шрифта, например: "Inter_normal_400_16"
  letterSpacing?: number;
  metadata: {
    originalRunIndex: number;
    style: TextRunNode['style'];
    inlineWidget?: TextRunNode['inlineWidget'];
  };
}
📤 Выходные модели (Layout Tree / Physical Box Model)
Результат работы движка — полностью детерминированное дерево координат с абсолютным позиционированием.

TypeScript
export interface ParagraphLayoutResult {
  width: number;
  height: number; // Полная физическая высота абзаца со всеми отступами
  lines: LineBox[];
}

export interface LineBox {
  x: number;      // Абсолютный X строки в контейнере
  y: number;      // Абсолютный Y строки (верхняя граница строки)
  width: number;  // Фактическая ширина контента в строке
  height: number; // Полная высота строки (max по всем фрагментам с учетом их lineHeight)
  
  // Метрики выравнивания базовых линий (Критично!)
  baseline: number; // Смещение базовой линии от верхнего края строки (y)
  ascent: number;   // Максимальный подъем над базовой линией в этой строке
  descent: number;  // Максимальный спуск под базовую линию
  
  startIndex: number; // Индекс первого символа в исходной строке абзаца
  endIndex: number;   // Индекс последнего символа
  fragments: FragmentBox[];
}

export interface FragmentBox {
  x: number;      // Смещение по X относительно начала LineBox
  width: number;  // Физическая ширина фрагмента
  text: string;   // Текст фрагмента
  itemIndex: number; // Ссылка на исходный Run
  
  fontMetrics: {
    ascent: number;
    descent: number;
    fontSize: number;
  };
  
  style: TextRunNode['style'];
  glyphAdvances?: number[]; // Массив смещений для посимвольного трекинга/выделения
}
🔤 3. Управление Шрифтами & FontMetricsProvider
Интерфейс должен быть изоморфным. Так как под капотом pretext уже использует нативный Canvas для измерения ширин, мы расширяем эту концепцию для получения точных вертикальных метрик.

Регистрация шрифтов (Font Registration)
Если мы работаем на сервере (Node.js) или нам нужны 100% точные метрики из файлов без рендеринга в DOM, мы должны иметь возможность зарегистрировать бинарный шрифт в FontMetricsProvider через fontkit.

TypeScript
export interface FontMetrics {
  ascent: number;
  descent: number;
  capHeight: number;
  unitsPerEm: number;
}

export interface IFontMetricsProvider {
  registerFont(family: string, options: { weight: string; style: string }, source: string | Buffer): void;
  getMetrics(fontFamily: string, fontSize: number, weight?: string, style?: string): FontMetrics;
}
Пример реализации с двойной стратегией (Canvas / Fontkit)
TypeScript
import fontkit from 'fontkit'; // Для Node.js окружения

export class FontMetricsProvider implements IFontMetricsProvider {
  private fontCache = new Map<string, any>();

  public registerFont(family: string, options: any, source: string | Buffer) {
    // fontkit парсит TTF/OTF таблицы (hhea, OS/2)
    const font = fontkit.create(source instanceof Buffer ? source : Buffer.from(source));
    const key = `${family}_${options.weight || 'normal'}_${options.style || 'normal'}`;
    this.fontCache.set(key, font);
  }

  public getMetrics(fontFamily: string, fontSize: number, weight = 'normal', style = 'normal'): FontMetrics {
    const key = `${fontFamily}_${weight}_${style}`;
    
    // Стратегия 1: Если шрифт зарегистрирован через бинарник (fontkit)
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

    // Стратегия 2: Фолбек на Браузерный Canvas TextMetrics (если мы на клиенте)
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      ctx.font = `${style} ${weight} ${fontSize}px ${fontFamily}`;
      const metrics = ctx.measureText('M'); // Опорный символ
      
      return {
        // Современные свойства Canvas API
        ascent: metrics.fontBoundingBoxAscent || fontSize * 0.85,
        descent: metrics.fontBoundingBoxDescent || fontSize * 0.15,
        capHeight: metrics.actualBoundingBoxAscent || fontSize * 0.7,
        unitsPerEm: 1000 // Виртуальный скейл
      };
    }

    // Грубый фолбек, если нет ни среды, ни файла
    return { ascent: fontSize * 0.8, descent: fontSize * 0.2, capHeight: fontSize * 0.7, unitsPerEm: 1000 };
  }
}
🧪 4. Стратегия тестирования и инварианты (По стопам Parley)
При написании тестов агент должен руководствоваться строгими геометрическими инвариантами проекта Parley (Linebender).

📐 Ключевые инварианты для проверки в тестах:
Инвариант Консистентности Индексов: Сумма длин всех строк (endIndex - startIndex) должна строго равняться длине исходного текста параграфа. Буквы не могут исчезать или дублироваться при переносе.

Инвариант Нулевой Ширины (width: 0): Движок не должен падать или уходить в бесконечный цикл. Текст должен корректно разбиться посимвольно или пословно по вертикали.

Инвариант Бесконечной Ширины (width: Infinity): Весь параграф должен скомпоноваться ровно в одну строку (LineBox).

Инвариант Выравнивания Базовой Линии: Внутри одной строки (LineBox) координата Y для отрисовки глифов каждого фрагмента (line.y + line.baseline) должна быть константной, независимо от размеров шрифтов (fontSize) соседних фрагментов.

📋 Примеры эталонных тестов (TypeScript + Vitest/Jest)
Агент должен реализовать следующий набор тестов для верификации PositioningEngine:

TypeScript
import { describe, test, expect, beforeEach } from 'vitest';
import { FontMetricsProvider } from './FontMetricsProvider';
import { ParagraphLayoutEngine } from './ParagraphLayoutEngine';
import { RichTextDocument } from './types';

describe('Paragraph Layout Engine Invariants', () => {
  let provider: FontMetricsProvider;
  let engine: ParagraphLayoutEngine;

  beforeEach(() => {
    provider = new FontMetricsProvider();
    // Регистрируем стандартный шрифт для изоморфных тестов (mock или реальный buffer)
    engine = new ParagraphLayoutEngine(provider);
  });

  test('Index Consistency Invariant (No lost characters)', () => {
    const doc: RichTextDocument = {
      paragraphs: [{
        type: 'paragraph',
        style: { alignment: 'left', lineHeight: 1.2, spaceBefore: 0, spaceAfter: 0 },
        children: [
          { type: 'text', text: 'Hello World! This is a long rich text layout engine test.', style: { fontFamily: 'Inter', fontSize: 16, fontWeight: 'normal', fontStyle: 'normal', color: 'black' } }
        ]
      }]
    };

    const result = engine.layout(doc.paragraphs[0], 150); // Узкий контейнер, заставит переносить
    
    let totalCharactersInLines = 0;
    result.lines.forEach(line => {
      totalCharactersInLines += (line.endIndex - line.startIndex);
    });

    const originalLength = doc.paragraphs[0].children[0].text.length;
    expect(totalCharactersInLines).toBe(originalLength);
  });

  test('Zero Width Container Invariant', () => {
    const doc: RichTextDocument = {
      paragraphs: [{
        type: 'paragraph',
        style: { alignment: 'left', lineHeight: 1.2, spaceBefore: 0, spaceAfter: 0 },
        children: [{ type: 'text', text: 'Pretext Engine', style: { fontFamily: 'Inter', fontSize: 16, fontWeight: 'normal', fontStyle: 'normal', color: 'black' } }]
      }]
    };

    // Проверяем крайний случай: контейнер равен 0
    expect(() => engine.layout(doc.paragraphs[0], 0)).not.toThrow();
    const result = engine.layout(doc.paragraphs[0], 0);
    expect(result.lines.length).toBeGreaterThan(1); // Текст разбился вертикально
  });

  test('Snapshot Testing for Layout Tree Geometry', () => {
    const doc: RichTextDocument = {
      paragraphs: [{
        type: 'paragraph',
        style: { alignment: 'justify', lineHeight: 1.5, spaceBefore: 10, spaceAfter: 12 },
        children: [
          { type: 'text', text: 'Justified text with ', style: { fontFamily: 'Inter', fontSize: 14, fontWeight: 'normal', fontStyle: 'normal', color: 'black' } },
          { type: 'text', text: 'bold fragment', style: { fontFamily: 'Inter', fontSize: 14, fontWeight: 'bold', fontStyle: 'normal', color: 'red' } }
        ]
      }]
    };

    const result = engine.layout(doc.paragraphs[0], 300);

    // Сериализуем дерево в плоский снимок для контроля малейших сдвигов пикселей
    const snapshotView = result.lines.map(line => ({
      y: line.y,
      width: line.width,
      baseline: line.baseline,
      ascent: line.ascent,
      descent: line.descent,
      fragments: line.fragments.map(f => ({ text: f.text, x: f.x, w: f.width }))
    }));

    expect(snapshotView).toMatchSnapshot();
  });
});
🚀 5. Пошаговый план для Написания Кода (Инструкция Агенту)
Шаг 1: Реализовать FontMetricsProvider и убедиться, что он возвращает консистентные ascent и descent как в среде Node.js (через fontkit), так и в браузере.

Шаг 2: Написать компилятор (prepare), который превращает ParagraphNode в массив структур RichInlineItem, ожидаемых библиотекой pretext. Стили складывать в metadata.

Шаг 3: Реализовать базовый PositioningEngine (расчет LineBox[] на основе коллбека walkRichInlineLineRanges). Выравнивать фрагменты строки по верхней границе максимального ascent.

Шаг 4: Добавить поддержку text-align: center | right | justify. При justify — брать дельту свободной ширины строки и пропорционально распределять ее в gapBefore фрагментов (или использовать механизмы распределения пробелов внутри pretext).

Шаг 5: Покрыть код инвариантными тестами из Раздела 4 и зафиксировать финальный геометрический Снапшот.