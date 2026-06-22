import type { SourceAdapter } from './types';

export class GithubAdapter implements SourceAdapter {
  async fetch(path: string): Promise<string> {
    // path = "owner/repo/branch/path/to/file.md"
    const url = `https://raw.githubusercontent.com/${path}`;
    const response = await globalThis.fetch(url, {
      headers: { Accept: 'text/plain' },
    });
    if (!response.ok) {
      throw new Error(`GitHub fetch failed ${response.status}: ${url}`);
    }
    return response.text();
  }
}
