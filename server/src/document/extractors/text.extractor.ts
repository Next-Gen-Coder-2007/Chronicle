import { Injectable } from '@nestjs/common';
import type { DocumentExtractor } from './document-extractor.interface.js';

@Injectable()
export class TextExtractor implements DocumentExtractor {
  supports(mimeType: string, filename?: string): boolean {
    if (
      mimeType === 'text/csv' ||
      mimeType === 'text/html' ||
      mimeType === 'text/json'
    ) {
      return false;
    }
    if (
      mimeType === 'text/plain' ||
      mimeType === 'text/markdown' ||
      mimeType === 'text/x-markdown'
    ) {
      return true;
    }
    if (filename && /\.(txt|md|markdown|log|text)$/i.test(filename)) {
      return true;
    }
    return false;
  }

  async extract(data: Buffer): Promise<string> {
    const text = data.toString('utf-8');
    return text.replace(/\r\n/g, '\n').trim();
  }
}
