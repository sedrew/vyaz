[vyaz-monorepo](../../../index.md) / [renderers/src](../index.md) / RegisterFontResult

# Interface: RegisterFontResult

Defined in: [renderers/src/register-font.ts:23](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/register-font.ts#L23)

## Properties

### browser

> **browser**: `boolean`

Defined in: [renderers/src/register-font.ts:28](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/register-font.ts#L28)

Added to `document.fonts` (browser only; `false` in Node/Bun).

***

### engine

> **engine**: `boolean`

Defined in: [renderers/src/register-font.ts:26](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/register-font.ts#L26)

Registered with `fontMetricsProvider` (the layout engine).

***

### family

> **family**: `string`

Defined in: [renderers/src/register-font.ts:24](https://github.com/sedrew/vyaz/blob/main/packages/renderers/src/register-font.ts#L24)
