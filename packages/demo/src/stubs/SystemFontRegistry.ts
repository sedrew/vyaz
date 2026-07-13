/**
 * Browser stub for @vyaz/core's SystemFontRegistry.
 *
 * In the browser, fonts are registered via CSS @font-face,
 * so system font scanning is a no-op.
 */

interface ScanResult {
  total: number;
  registered: number;
}

class SystemFontRegistryStub {
  private registered = new Map<string, true>();

  async scan(): Promise<ScanResult> {
    return { total: 0, registered: 0 };
  }

  isRegistered(_family: string): boolean {
    return false;
  }

  getRegisteredFamilies(): string[] {
    return [];
  }
}

/** Singleton instance */
export const systemFontRegistry = new SystemFontRegistryStub() as any;