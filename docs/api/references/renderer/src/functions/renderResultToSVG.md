[vyaz-monorepo](../../../index.md) / [renderer/src](../index.md) / renderResultToSVG

# Function: renderResultToSVG()

> **renderResultToSVG**(`result`, `options?`): `string`

Defined in: [renderer/src/SVGRenderer.ts:1101](https://github.com/sedrew/vyaz/blob/main/packages/renderer/src/SVGRenderer.ts#L1101)

Render a ParagraphLayoutResult to SVG, auto-passing dimensions.

Uses `result.width` and `result.height` as the SVG canvas size.
This is the recommended way to render when you have a layout result
and want `sizing: 'frame'` with correct dimensions.

## Parameters

### result

[`ParagraphLayoutResult`](../../../core/src/interfaces/ParagraphLayoutResult.md)

— layout result from ParagraphLayoutEngine.layout()

### options?

[`SVGRenderOptions`](../interfaces/SVGRenderOptions.md)

— rendering options (preset, style, fit, etc.)

## Returns

`string`

SVG string

## Example

```ts
const result = paragraphLayoutEngine.layout(paragraph, 300);
const svg = renderResultToSVG(result, { preset: 'preserve' });
```
