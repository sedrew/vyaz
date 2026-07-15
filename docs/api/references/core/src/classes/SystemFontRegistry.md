[vyaz-monorepo](../../../index.md) / [core/src](../index.md) / SystemFontRegistry

# Class: SystemFontRegistry

Defined in: [core/src/measure/SystemFontRegistry.ts:66](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/SystemFontRegistry.ts#L66)

## Accessors

### instance

#### Get Signature

> **get** `static` **instance**(): `SystemFontRegistry`

Defined in: [core/src/measure/SystemFontRegistry.ts:74](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/SystemFontRegistry.ts#L74)

##### Returns

`SystemFontRegistry`

## Methods

### getRegisteredFamilies()

> **getRegisteredFamilies**(): `string`[]

Defined in: [core/src/measure/SystemFontRegistry.ts:146](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/SystemFontRegistry.ts#L146)

Get list of all registered font families.

#### Returns

`string`[]

***

### isRegistered()

> **isRegistered**(`family`): `boolean`

Defined in: [core/src/measure/SystemFontRegistry.ts:139](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/SystemFontRegistry.ts#L139)

Check if a font family is registered.

#### Parameters

##### family

`string`

#### Returns

`boolean`

***

### scan()

> **scan**(): `Promise`\<`ScanResult`\>

Defined in: [core/src/measure/SystemFontRegistry.ts:90](https://github.com/sedrew/vyaz/blob/main/packages/core/src/measure/SystemFontRegistry.ts#L90)

Scan the system for all fonts and register them in FontMetricsProvider.

- Uses `get-system-fonts` to find all .ttf/.otf files
- Opens each with fontkit to extract familyName/subfamilyName
- Registers in fontMetricsProvider (fontkit buffer + canvas path)

#### Returns

`Promise`\<`ScanResult`\>

stats about what was found and registered
