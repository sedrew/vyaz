/**
 * image.ts — `<img>` → an inline-box widget backed by an `<image>` fragment.
 *
 * The renderer never sees an image URL; it only splices the SVG fragment this
 * module puts in `inlineBoxes[id]` (same contract as `<table>`). So the
 * embed-vs-link decision is made *here*, at conversion time:
 *
 *   1. `opts.resolveImage(el)` runs first — a non-`undefined` return takes the
 *      image over completely (dimensions + fragment authored by the caller).
 *   2. Otherwise the built-in handler applies `opts.images`:
 *      - `data:` source  → always spliced in as-is (already self-contained).
 *      - remote source   → `<image href="…">`; under `images:'embed'` that is a
 *        fallback (can't fetch bytes synchronously) and emits a warning.
 *
 * Dimensions come from the `width`/`height` attributes, or — for a `data:`
 * image with neither — are sniffed from the bytes (PNG / GIF / JPEG / SVG).
 * With no usable size the image is dropped and its `alt` kept as plain text.
 */
import type { ResolvedOptions } from './options.js';
import type { Collector } from './warnings.js';

/** What `resolveImg` hands back to the walker. */
export type ImgResult =
  /** Paint an inline box: reserve `width`×`height`, splice `svg` into it. */
  | { kind: 'box'; width: number; height: number; svg: string }
  /** Nothing to paint — emit this text instead (an `alt` fallback), if non-empty. */
  | { kind: 'text'; text: string }
  /** Nothing at all. */
  | { kind: 'drop' };

/** `data:` MIME types we accept on an `<img>` (anything else is an XSS smell). */
const DATA_IMAGE_RE = /^data:image\/(png|jpe?g|gif|webp|avif|bmp|svg\+xml|x-icon|vnd\.microsoft\.icon)[;,]/i;

/** Schemes that never belong on an `<img src>` in portable SVG output. */
const UNSAFE_SCHEME_RE = /^(javascript|vbscript|file|blob):/i;

function attrInt(el: Element, name: string): number | undefined {
  const raw = el.getAttribute?.(name);
  if (raw == null) return undefined;
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Minimal XML attribute-value escaping for the `href` we splice in. */
function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function imageFragment(href: string, w: number, h: number): string {
  return `<image href="${escapeAttr(href)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
}

/**
 * Resolve one `<img>`. `style` supplies the font fields the inline-box run
 * needs to sit in the line (it is measured as a single `￼` glyph).
 */
export function resolveImg(el: Element, opts: ResolvedOptions, col: Collector): ImgResult {
  const alt = (el.getAttribute?.('alt') ?? '').trim();
  const altFallback = (): ImgResult => (alt ? { kind: 'text', text: alt } : { kind: 'drop' });

  // 1. Caller override.
  if (opts.resolveImage) {
    const r = opts.resolveImage(el);
    if (r) {
      if (r.width > 0 && r.height > 0 && r.svg) {
        return { kind: 'box', width: r.width, height: r.height, svg: r.svg };
      }
      col.warn('img-resolve-invalid', 'img', 'resolveImage() returned a value with no size or svg — ignored');
    }
  }

  // 2. Built-in handler.
  const src = (el.getAttribute?.('src') ?? '').trim();
  if (!src) {
    col.warn('img-no-src', 'img', 'no src — dropped');
    return altFallback();
  }

  const isData = src.startsWith('data:');
  if (isData && !DATA_IMAGE_RE.test(src)) {
    col.warn('img-src-unsafe', 'img', `data: src is not an image type — dropped`);
    return altFallback();
  }
  if (!isData && UNSAFE_SCHEME_RE.test(src)) {
    col.warn('img-src-unsafe', 'img', `src="${src.slice(0, 40)}…" has a disallowed scheme — dropped`);
    return altFallback();
  }

  // Dimensions: explicit attributes win; otherwise sniff a data: image.
  let w = attrInt(el, 'width');
  let h = attrInt(el, 'height');
  if ((w === undefined || h === undefined) && isData) {
    const sniffed = sniffDataImageSize(src);
    if (sniffed) {
      w = w ?? sniffed.w;
      h = h ?? sniffed.h;
      // If only one attribute was given, keep the intrinsic aspect ratio.
      if (attrInt(el, 'width') === undefined && attrInt(el, 'height') !== undefined) w = Math.round((h! * sniffed.w) / sniffed.h);
      if (attrInt(el, 'height') === undefined && attrInt(el, 'width') !== undefined) h = Math.round((w! * sniffed.h) / sniffed.w);
    }
  }
  if (w === undefined || h === undefined) {
    col.warn('img-no-dimensions', 'img', 'no width/height and none could be inferred — dropped');
    return altFallback();
  }

  // Encode.
  if (isData) {
    return { kind: 'box', width: w, height: h, svg: imageFragment(src, w, h) };
  }
  if (opts.images === 'embed') {
    col.warn(
      'img-remote-not-embedded',
      'img',
      `images:'embed' can't fetch "${src.slice(0, 40)}…" synchronously — linked instead; pre-resolve it in resolveImage() to inline the bytes`,
    );
  }
  return { kind: 'box', width: w, height: h, svg: imageFragment(src, w, h) };
}

// ── Intrinsic-size sniffing (data: images only) ─────────────────────────────

/** Decode the payload of a `data:` URI to bytes (base64 or percent-encoded). */
function decodeDataPayload(src: string): { bytes: Uint8Array; text: string; mime: string } | null {
  const comma = src.indexOf(',');
  if (comma < 0) return null;
  const header = src.slice(5, comma); // after "data:"
  const payload = src.slice(comma + 1);
  const mime = header.split(';')[0].toLowerCase();
  const isB64 = /;base64/i.test(header);
  try {
    if (isB64) {
      if (typeof atob !== 'function') return null;
      const bin = atob(payload.replace(/\s+/g, ''));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return { bytes, text: bin, mime };
    }
    const text = decodeURIComponent(payload);
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff;
    return { bytes, text, mime };
  } catch {
    return null;
  }
}

function sniffDataImageSize(src: string): { w: number; h: number } | null {
  const decoded = decodeDataPayload(src);
  if (!decoded) return null;
  const { bytes, text, mime } = decoded;

  if (mime === 'image/svg+xml') return sniffSvgSize(text);

  const b = bytes;
  // PNG: 8-byte signature, then IHDR (width/height as big-endian u32 at 16/20).
  if (b.length >= 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    const w = (b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19];
    const h = (b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23];
    if (w > 0 && h > 0) return { w, h };
  }
  // GIF: "GIF87a"/"GIF89a", then logical-screen width/height as little-endian u16.
  if (b.length >= 10 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) {
    const w = b[6] | (b[7] << 8);
    const h = b[8] | (b[9] << 8);
    if (w > 0 && h > 0) return { w, h };
  }
  // JPEG: scan marker segments for a Start-Of-Frame (SOF0-3, 5-7, 9-11, 13-15).
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { i += 2; continue; }
      const segLen = (b[i + 2] << 8) | b[i + 3];
      const isSOF = (marker >= 0xc0 && marker <= 0xcf) && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSOF) {
        const h = (b[i + 5] << 8) | b[i + 6];
        const w = (b[i + 7] << 8) | b[i + 8];
        if (w > 0 && h > 0) return { w, h };
        return null;
      }
      if (segLen < 2) return null;
      i += 2 + segLen;
    }
  }
  // WebP/AVIF/BMP/ICO: not sniffed — caller falls back to alt text.
  return null;
}

function sniffSvgSize(svg: string): { w: number; h: number } | null {
  const head = svg.slice(0, 2000);
  const num = (s: string | undefined): number | undefined => {
    if (!s) return undefined;
    const n = Number.parseFloat(s);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const wAttr = num(/\bwidth\s*=\s*["']?\s*([\d.]+)/i.exec(head)?.[1]);
  const hAttr = num(/\bheight\s*=\s*["']?\s*([\d.]+)/i.exec(head)?.[1]);
  if (wAttr && hAttr) return { w: Math.round(wAttr), h: Math.round(hAttr) };
  const vb = /\bviewBox\s*=\s*["']\s*[-\d.]+[ ,]+[-\d.]+[ ,]+([\d.]+)[ ,]+([\d.]+)/i.exec(head);
  if (vb) {
    const w = num(vb[1]);
    const h = num(vb[2]);
    if (w && h) return { w: Math.round(w), h: Math.round(h) };
  }
  return null;
}
