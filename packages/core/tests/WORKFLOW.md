# Test Workflow — @vyaz/core

## Running tests

```bash
cd packages/core
bun test
```

Or from monorepo root:

```bash
bun test --filter @vyaz/core
```

Bun's built-in test runner is used (Jest-compatible API).

## File structure

```
tests/
├── WORKFLOW.md              # this file
├── fixtures/
│   └── unifont-17.0.05.otf  # deterministic test font
├── helpers.ts               # shared test helpers
└── text-run.test.ts         # TextRun property tests (19 sections)
```

## Naming conventions

- **Test files**: `*.test.ts` (Bun auto-discovers)
- **Fixtures**: placed in `tests/fixtures/`
- **Helpers**: shared utilities in `tests/helpers.ts`

## Test helpers (`helpers.ts`)

| Helper | Purpose |
|--------|---------|
| `makeParagraph(text, overrides?)` | Single-run Paragraph with Unifont |
| `makeStyledParagraph(text, style)` | Paragraph with custom font (Arial, etc.) |
| `makeMultiRunParagraph(runs)` | Multi-run Paragraph with different styles |
| `layoutParagraph(paragraph, maxWidth?)` | Layout + invariant assertion |
| `allFragments(result)` | Flat array of all FragmentBox |
| `allTextFragments(result)` | Only `type: 'text'` fragments |
| `allSpaceFragments(result)` | Only `type: 'space'` fragments |
| `spanTexts(result)` | Array of fragment texts |
| `lastFragment(result)` | Last fragment of last line |
| `hasCanvas()` | Check if @napi-rs/canvas is available |
| `registerUnifont()` | Register Unifont in fontMetricsProvider |

## When to skip tests

- Font-specific tests (Arial, Times New Roman) that require Canvas fallback — skip with `test.skip` when `hasCanvas()` returns `false`.
- Browser-only features — check environment in `beforeAll`.

## Adding new tests

1. Create `tests/<feature>.test.ts`
2. Import helpers from `./helpers.ts`
3. Call `layoutParagraph()` with the Paragraph builder
4. Assert on FragmentBox, LineBox, or ParagraphLayoutResult

## Font registration

All tests must register Unifont in `beforeAll`:

```ts
beforeAll(async () => {
  await registerUnifont();
});
```

## Writing assertions

Use Bun's built-in assertions (`expect` from `bun:test`):

```ts
import { describe, test, expect, beforeAll } from 'bun:test';
```

For fragment properties:

```ts
const result = layoutParagraph(makeParagraph('Hello'));
const frag = allFragments(result)[0];
expect(frag.type).toBe('text');
expect(frag.style.fontFamily).toBe('Unifont');