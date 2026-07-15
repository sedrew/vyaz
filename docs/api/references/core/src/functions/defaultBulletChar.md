[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / defaultBulletChar

# Function: defaultBulletChar()

> **defaultBulletChar**(`level`): `string`

Defined in: [core/src/utils/list.ts:35](https://github.com/sedrew/vyaz/blob/main/packages/core/src/utils/list.ts#L35)

Get the default bullet character for a given nesting level.

CSS UA stylesheet uses:
- Level 0 (ul): disc (•)
- Level 1 (ul ul): circle (○)
- Level 2+ (ul ul ul): square (▪)

## Parameters

### level

`number`

## Returns

`string`
