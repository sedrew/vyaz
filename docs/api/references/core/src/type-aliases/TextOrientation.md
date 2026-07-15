[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / TextOrientation

# Type Alias: TextOrientation

> **TextOrientation** = `"mixed"` \| `"upright"` \| `"sideways"`

Defined in: [core/src/types/Document.ts:46](https://github.com/sedrew/vyaz/blob/main/packages/core/src/types/Document.ts#L46)

Character orientation inside a vertical line.

Only applies when `writingMode !== 'horizontal-tb'`:
- `mixed`: Latin digits/letters are rotated 90°, CJK glyphs remain upright.
- `upright`: **all** characters stand upright (stacked vertically).
- `sideways`: the whole text block is rotated 90° (like a rotated box).

## See

[CSS Writing Modes: text-orientation](https://www.w3.org/TR/css-writing-modes-3/#text-orientation)
