import { Injectable, Logger } from '@nestjs/common';
import { createRequire } from 'node:module';
import type { DocumentExtractor } from './document-extractor.interface.js';

const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');

@Injectable()
export class PdfExtractor implements DocumentExtractor {
  private readonly logger = new Logger(PdfExtractor.name);

  supports(mimeType: string, filename?: string): boolean {
    if (mimeType === 'application/pdf') {
      return true;
    }
    if (filename && /\.pdf$/i.test(filename)) {
      return true;
    }
    return false;
  }

  async extract(data: Buffer, filename: string): Promise<string> {
    try {
      let rawText = '';

      if (typeof pdfParseModule?.PDFParse === 'function') {
        const parser = new pdfParseModule.PDFParse({ data });
        try {
          const result = await parser.getText();
          rawText = result?.text || '';
        } finally {
          await parser.destroy();
        }
      } else if (typeof pdfParseModule === 'function') {
        const result = await pdfParseModule(data);
        rawText = result?.text || '';
      } else {
        throw new Error('PDF parsing library could not be initialized');
      }

      const cleaned = rawText
        .replace(/\r\n/g, '\n')
        .replace(/-- \d+ of \d+ --\n?/g, '')
        .trim();

      if (!cleaned) {
        return `[Notice: Text could not be extracted from "${filename}". The PDF may be empty or contains scanned/image-only pages with no embedded text layer.]`;
      }

      return cleaned;
    } catch (err: any) {
      this.logger.error(`Failed to extract text from PDF "${filename}": ${err.message}`);
      throw new Error(`PDF extraction failed: ${err.message}`);
    }
  }
}
