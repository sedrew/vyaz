[vyaz-monorepo](../../../index.md) / [renderer/src](../index.md) / CharPos

# Interface: CharPos

Defined in: [renderer/src/interactive.ts:21](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/interactive.ts#L21)

A resolved character position within the layout tree.

Contains enough context for cursor placement, selection start/end,
and hit-testing.

## Properties

### charIndex

> **charIndex**: `number`

Defined in: [renderer/src/interactive.ts:27](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/interactive.ts#L27)

Index of the character within the span text (0-based).

***

### line

> **line**: `Line`

Defined in: [renderer/src/interactive.ts:37](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/interactive.ts#L37)

Reference to the owning Line.

***

### lineIndex

> **lineIndex**: `number`

Defined in: [renderer/src/interactive.ts:23](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/interactive.ts#L23)

Index of the line in the lines array (0-based).

***

### pIdx

> **pIdx**: `number`

Defined in: [renderer/src/interactive.ts:29](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/interactive.ts#L29)

Paragraph index (from Span.pIdx).

***

### span

> **span**: `Span`

Defined in: [renderer/src/interactive.ts:39](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/interactive.ts#L39)

Reference to the owning Span.

***

### spanIndex

> **spanIndex**: `number`

Defined in: [renderer/src/interactive.ts:25](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/interactive.ts#L25)

Index of the span within the line (0-based).

***

### width

> **width**: `number`

Defined in: [renderer/src/interactive.ts:35](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/interactive.ts#L35)

Character advance width in px (from glyphAdvances or estimated).

***

### x

> **x**: `number`

Defined in: [renderer/src/interactive.ts:31](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/interactive.ts#L31)

Absolute X position of the character's left edge (CSS px).

***

### y

> **y**: `number`

Defined in: [renderer/src/interactive.ts:33](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/interactive.ts#L33)

Absolute Y position of the character's baseline (CSS px).
