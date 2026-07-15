[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / collapseSegmentWhitespace

# Function: collapseSegmentWhitespace()

> **collapseSegmentWhitespace**(`segment`): `string`

Defined in: [core/src/compile/DocumentCompiler.ts:88](https://github.com/sedrew/vyaz/blob/main/packages/core/src/compile/DocumentCompiler.ts#L88)

Collapse consecutive collapsible whitespace → single space.
Trim leading/trailing. CSS Text §4.1.1.

Uses native regex (C++ in V8) instead of a manual JS loop.

## Parameters

### segment

`string`

## Returns

`string`
