# Issues: FontRegistry — explicit font registration

All issues go to the `run` branch. Covers the `FontMetricsProvider` changes: explicit registration via file paths (not Buffer), dual registration in fontkit + node-canvas, strict validation (throw on missing font), and a convenience method for loading system fonts.

---

## FONT-1: Migrate to file-path based registration
Change `registerFont()` to accept file paths instead of raw buffers.

**Current:**
```ts
registerFont(family: string, options: { weight?, style? }, source: string | Buffer): Promise<void>
```

**New:**
```ts
registerFont(family: string, variants: FontRegistration[]): void
// where FontRegistration = { weight: string, style: string, source: string }
```

Only file paths (`string`) are accepted — no raw buffers. This allows both fontkit and node-canvas to access the font file.

**Acceptance Criteria:**
- [ ] `registerFont('Inter', [{ weight: '400', style: 'normal', source: './fonts/Inter-Regular.ttf' }])` works
- [ ] fontkit parses the `.ttf` via `fontkit.openSync(path)` and caches the font object
- [ ] old API with Buffer throws a clear error: "registerFont accepts file paths only"
- [ ] `getFont(family, weight, style)` returns the cached fontkit font
- [ ] multiple variants for the same family (e.g. regular + bold) are cached separately by `family_weight_style` key

---

## FONT-2: Dual registration — fontkit + node-canvas
Register the font in both fontkit (for metrics) and node-canvas (for rendering).

**Problem:** Currently `registerFont()` only stores fontkit font object. `ctx.measureText('A')` in Canvas renderer still uses the default font because node-canvas doesn't know about the registered font.

**Solution:** On `registerFont()`, also call `canvas.registerFont(path, { family, weight?, style? })`.

```ts
function registerFont(family, variants) {
  for (const v of variants) {
    // 1. fontkit: open and cache for metrics
    const font = fontkit.openSync(v.source);
    cache.set(key, font);
    
    // 2. node-canvas: register for Canvas API
    try {
      const { registerFont } = await import('canvas');
      registerFont(v.source, { family, weight: v.weight, style: v.style });
    } catch {
      // Canvas not available (browser) — skip
    }
    
    // 3. Clear metrics cache for this font
    metricsCache.delete(key);
  }
}
```

**Acceptance Criteria:**
- [ ] after `registerFont('Arial', ...)`, `ctx.measureText('A')` returns correct Arial metrics (not fallback)
- [ ] `renderToCanvas()` with a registered font renders correct glyphs
- [ ] Canvas fallback path: if `canvas.registerFont` throws — error is caught, not propagated
- [ ] fontkit font is available even when Canvas is not available
- [ ] `getMetrics()` uses fontkit font regardless of Canvas registration status

---

## FONT-3: Strict validation — throw on missing font
Currently `getMetrics()` returns `fontSize * 0.85 / 0.15` with `sourceTable: 'fallback'` when a font is not registered. This silently produces wrong metrics.

**New behavior:**
- Registered font → metrics
- Not registered → throw `Error` with a clear message

```ts
getMetrics(family, size, weight, style): FontMetrics {
  const key = cacheKey(family, weight, style);
  const font = this.cache.get(key);
  if (!font) {
    throw new Error(
      `FontMetricsProvider: "${family}" (weight=${weight}, style=${style}) is not registered. ` +
      `Call fontMetricsProvider.registerFont('${family}', ...) first.`
    );
  }
  // ... calculate metrics from font
}
```

**Acceptance Criteria:**
- [ ] `getMetrics('NotRegistered', 16)` throws `Error`
- [ ] error message includes the font family name
- [ ] error message says which weight/style was requested
- [ ] error message tells user to call `registerFont()` first
- [ ] after `registerFont('Unifont', ...)`, `getMetrics('Unifont', 16)` returns valid metrics (no error)
- [ ] tests verify both registered and unregistered font behavior

---

## FONT-4: Remove fallback metrics
Remove the Canvas fallback and `fontSize * 0.85` fallback from `getMetrics()` in Node.js. Keep Canvas fallback only in browser (for system fonts not registered via `registerFont()`).

**Acceptance Criteria:**
- [ ] in Node.js, `getMetrics('Unregistered', 16)` throws (no fallback)
- [ ] in browser, `getMetrics('Unregistered', 16)` uses Canvas fallback (existing behavior)
- [ ] `sourceTable` is always `'hhea'` or `'OS/2'` in Node.js (never `'canvas'` or `'fallback'`)
- [ ] `FONT-3` throw behavior is platform-independent (Node.js and browser both throw if no font and no Canvas)

---

## FONT-5: Remove hardcoded 1.078 line gap factor
Currently in office mode:
```ts
ascent = os2.winAscent * scale * 1.078;  // hardcoded
```

This is Arial-specific. Use `font.lineGap` (hhea table) instead:
```ts
const lineGap = font.lineGap * scale; // dynamic per-font
const lineHeight = (winAscent + |winDescent| + lineGap) * scale;
```

**Acceptance Criteria:**
- [ ] office mode no longer multiplies by hardcoded `1.078`
- [ ] office mode adds `font.lineGap * scale` to line height instead
- [ ] Arial at 100pt still produces ~120.5 pt line height (delta <= 0.5 pt)
- [ ] any font with no lineGap (lineGap = 0) falls back to `winAscent + winDescent` only
- [ ] test with a known font: verify line height matches expected office formula

---

## FONT-6: Update FontTypes interface
Update `IFontMetricsProvider` interface to match the new API.

**Current:**
```ts
interface IFontMetricsProvider {
  setMode(mode: 'browser' | 'office'): void;
  getMode(): 'browser' | 'office';
  registerFont(family, options, source): Promise<void>;
  getFont(family, weight?, style?): any | undefined;
  getMetrics(family, size, weight?, style?): FontMetrics;
}
```

**New:**
```ts
interface FontRegistrationVariant {
  weight: string;
  style: string;
  source: string;  // file path only
}

interface IFontMetricsProvider {
  setMode(mode: 'browser' | 'office'): void;
  getMode(): 'browser' | 'office';
  
  registerFont(family: string, variants: FontRegistrationVariant[]): void;
  unregisterFont(family: string): void;
  
  getFont(family: string, weight?: string, style?: string): any | undefined;
  getMetrics(family: string, fontSize: number, weight?: string, style?: string): FontMetrics;
}
```

**Acceptance Criteria:**
- [ ] `FontRegistrationVariant` type is exported from package
- [ ] `IFontMetricsProvider` has new method signatures
- [ ] `unregisterFont(family)` removes all variants for that family from both caches
- [ ] existing code that uses the old API breaks with a clear TypeScript error
- [ ] all tests compile after migration

---

## FONT-7: Tests for FontRegistry
Test the entire registration lifecycle.

**Acceptance Criteria:**
- [ ] `registerFont('TestFont', [{ weight: '400', style: 'normal', source: testTtfPath }])` succeeds
- [ ] `getFont('TestFont', '400', 'normal')` returns a font object with `.unitsPerEm`, `.ascent`, `.descent`
- [ ] `getMetrics('TestFont', 16)` returns valid metrics with `sourceTable: 'hhea'`
- [ ] `getMetrics('UnknownFont', 16)` throws `Error` with expected message
- [ ] `unregisterFont('TestFont')` — `getMetrics('TestFont', 16)` now throws
- [ ] `.ttc` (TrueType Collection) file → throws with clear "not supported" message
- [ ] invalid file path → throws with `ENOENT` or clear error
- [ ] multiple registerFont calls for the same family → each variant is accessible
- [ ] `sourceTable` = `'hhea'` in browser mode
- [ ] `sourceTable` = `'OS/2'` in office mode