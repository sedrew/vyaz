/**
 * Font utility helpers.
 *
 * Provides cross‑environment helpers for loading font data in the browser
 * (where there is no local filesystem).
 */

/**
 * Download a font file from a URL and return its bytes.
 *
 * Works in browser environments.  In Node.js you'd typically read the file
 * via `fs.readFileSync()` instead.
 *
 * @param fontUrl  URL of the font file (.ttf, .otf, .woff, .woff2)
 * @returns        Font file bytes as an ArrayBuffer
 */
export async function getFontBuffer(fontUrl: string): Promise<ArrayBuffer> {
  const response = await fetch(fontUrl);

  if (!response.ok) {
    throw new Error(
      `[vyaz] Failed to download font from "${fontUrl}": ${response.status} ${response.statusText}`,
    );
  }

  const buffer = await response.arrayBuffer();
  return buffer;
}