[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / AutofitConfig

# Interface: AutofitConfig

Defined in: [core/src/types/Document.ts:195](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L195)

Configuration for automatic font-size reduction (autofit).

When `enabled` is true, the layout engine will scale down the font size
of **all** runs proportionally so the text fits inside the frame's
`width` × `height`. The scaling stops at `minFontSize`.

## Example

```ts
{ enabled: true, minFontSize: 10, maxFontSize: 24, baseFontSize: 18 }
```

## See

[TextFrame.autofit](TextFrame.md#autofit)

## Properties

### baseFontSize?

> `optional` **baseFontSize?**: `number`

Defined in: [core/src/types/Document.ts:215](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L215)

Base font size used as a reference when `TextRun.fontSize`
is interpreted as a relative scale factor.

#### Todo

Currently `TextRun.fontSize` is absolute px.
      In future it may be a ratio relative to this base.

***

### enabled

> **enabled**: `boolean`

Defined in: [core/src/types/Document.ts:197](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L197)

Whether autofit is active.

***

### maxFontSize?

> `optional` **maxFontSize?**: `number`

Defined in: [core/src/types/Document.ts:207](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L207)

Maximum font size in px.
The engine will never grow text above this threshold.

***

### minFontSize?

> `optional` **minFontSize?**: `number`

Defined in: [core/src/types/Document.ts:202](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L202)

Minimum font size in px.
The engine will never shrink text below this threshold.
