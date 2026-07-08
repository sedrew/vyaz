/**
 * Minimal type declarations for fontkit.
 * fontkit does not ship native TypeScript types.
 */

declare module 'fontkit' {
  interface BBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }

  interface Glyph {
    id: number;
    advanceWidth: number;
    bbox: BBox;
    name: string;
    path: any;
  }

  interface TTFFont {
    unitsPerEm: number;
    ascent: number;
    descent: number;
    capHeight: number;
    xHeight: number;
    lineGap: number;
    underlinePosition: number;
    underlineThickness: number;
    familyName: string;
    subfamilyName: string;
    postscriptName: string;
    format: string;
    glyphsForString(text: string): Glyph[];
    getGlyph(glyphId: number): Glyph;
  }

  function create(buffer: Buffer, postscriptName?: string): TTFFont;
  function open(filename: string, postscriptName?: string): Promise<TTFFont>;
  function openSync(filename: string, postscriptName?: string): TTFFont;

  export { create, open, openSync, TTFFont, Glyph, BBox };
}