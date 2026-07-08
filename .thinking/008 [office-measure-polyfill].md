# Office mode: измерение текста без Canvas

## Проблема

Сейчас `@chenglou/pretext` всегда требует Canvas (`OffscreenCanvas` или `document.createElement('canvas')`) для измерения advance width через `ctx.measureText()`.

В browser mode это нормально — Canvas используется как источник метрик.

В office mode измерения всё равно идут в обход Canvas через officeMeasureText (fontkit hmtx), но Canvas всё равно создаётся и полифиллится. Это лишняя зависимость от `@napi-rs/canvas` и лишний оверхед.

## Цель

В office mode полностью отказаться от Canvas — измерения должны идти напрямую через fontkit, без создания Canvas объектов.

## Как сейчас

```
layout → prepareRichInline (pretext)
  → new OffscreenCanvas(1,1).getContext('2d')
  → ctx.measureText('A')
  → officeMeasureText() via fontkit hmtx
```

Canvas создаётся, но его measureText переопределён — просто лишний слой.

## Как должно быть

```
layout → prepareRichInline (pretext)
  → fontkit.measureText('A') напрямую
  → без Canvas
```

## Что нужно сделать

### 1. Изучить API pretext

Посмотреть в `@chenglou/pretext` (исходники или .d.ts):
- Можно ли передать кастомный measurer?
- Или нужно патчить `globalThis.CanvasRenderingContext2D.prototype.measureText` (как уже частично сделано)?
- Есть ли опция `disableCanvas` или аналоги?

### 2. Реализовать fontkit-only мерялку

Если pretext не умеет без Canvas:
- Создать адаптер, который реализует интерфейс measurement без Canvas
- Патчить `prepareRichInline` или оборачивать вызов

### 3. Убрать зависимость от Canvas в office mode

После реализации:
- `setup.ts` в office-тестах не будет требовать `OffscreenCanvas` полифилл
- `@napi-rs/canvas` станет не обязательным для office mode

## Варианты реализации

**A.** Патчить `globalThis.CanvasRenderingContext2D.prototype.measureText` при старте (уже есть в `canvas-polyfill.ts`, но не работает без Canvas). Расширить: если Canvas не доступен — использовать fontkit напрямую.

**B.** Сделать полноценный `fontkit.Measurer` и заменить подготовку pretext на свою.

**C.** Создать обёртку над fontkit, которая имитирует API `CanvasRenderingContext2D.measureText()` без Canvas, и подсунуть её вместо реального Canvas.

## Зависимости

- `fontkit` (уже есть)
- `@chenglou/pretext` (уже есть)
- `@napi-rs/canvas` (хотим убрать из обязательных для office)

## Статус

- [ ] Изучить API pretext для кастомного measurer
- [ ] Определить подход (A / B / C)
- [ ] Реализовать fontkit-only measurement
- [ ] Убрать Canvas polyfill из office-тестов
- [ ] Проверить: все wrap office тесты проходят без Canvas