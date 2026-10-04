export interface DocumentExtractor {
  supports(mimeType: string, filename?: string): boolean;

  extract(
    data: Buffer,
    filename: string,
    mimeType?: string,
  ): Promise<string>;
}
