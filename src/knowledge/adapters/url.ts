import type { SourceAdapter } from './types';

export class UrlAdapter implements SourceAdapter {
  async fetch(url: string): Promise<string> {
    const response = await globalThis.fetch(url);
    if (!response.ok) {
      throw new Error(`URL fetch failed ${response.status}: ${url}`);
    }
    return response.text();
  }
}
