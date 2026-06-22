/** Every source adapter must implement this interface. */
export interface SourceAdapter {
  /** Fetch raw text content from the given path/URL. */
  fetch(path: string): Promise<string>;
}
