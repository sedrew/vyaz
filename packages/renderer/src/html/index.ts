/**
 * html — HTML-to-TextFrame parser utilities.
 *
 * @example
 * ```ts
 * import { htmlToTextFrame } from '@vyaz/renderer/html';
 *
 * const frame = htmlToTextFrame('<p>Hello <b>world</b>!</p>', {
 *   width: 600,
 *   defaultStyle: { fontFamily: 'Arial', fontSize: 14, color: '#000' },
 * });
 * ```
 */

export { htmlToTextFrame } from './htmlToTextFrame.js';
export type { HtmlToTextFrameOptions } from './htmlToTextFrame.js';