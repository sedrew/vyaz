/**
 * Browser stub for get-system-fonts.
 *
 * In the browser, system font scanning is not available,
 * so return an empty array.
 */
export default async function getSystemFonts(): Promise<string[]> {
  return [];
}