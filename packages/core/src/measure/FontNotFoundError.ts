/**
 * FontNotFoundError.ts — thrown when a requested font is not registered.
 */
export class FontNotFoundError extends Error {
  constructor(
    family: string,
    weight = 'normal',
    style = 'normal',
  ) {
    super(
      `Font not found: "${family}" (weight: ${weight}, style: ${style}). ` +
      `Use SystemFontRegistry.scan() to register system fonts.`,
    );
    this.name = 'FontNotFoundError';
  }
}