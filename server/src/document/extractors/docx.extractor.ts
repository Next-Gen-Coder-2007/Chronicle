import { Injectable, Logger } from '@nestjs/common';
import mammoth from 'mammoth';
import type { DocumentExtractor } from './document-extractor.interface.js';

@Injectable()
export class DocxExtractor implements DocumentExtractor {
  private readonly logger = new Logger(DocxExtractor.name);

  supports(mimeType: string, filename?: string): boolean {
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      return true;
    }
    if (filename && /\.(docx|doc)$/i.test(filename)) {
      return true;
    }
    return false;
  }

  async extract(data: Buffer, filename: string): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer: data });
      const text = result.value ? result.value.replace(/\r\n/g, '\n').trim() : '';

      if (!text) {
        return `[Notice: Document "${filename}" is empty or has no readable text.]`;
      }

      return text;
    } catch (err: any) {
      this.logger.error(`Failed to extract text from DOCX "${filename}": ${err.message}`);
      throw new Error(`DOCX extraction failed: ${err.message}`);
    }
  }
}
