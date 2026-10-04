import { Injectable, Logger } from '@nestjs/common';
import { createRequire } from 'node:module';
import type {
  DocumentExtractor,
  ExtractionResult,
  ExtractedSegment,
} from './document-extractor.interface.js';

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
    const result = await this.extractStructured(data, filename);
    return result.fullText;
  }

  async extractStructured(data: Buffer, filename: string): Promise<ExtractionResult> {
    try {
      let rawText = '';
      const pageTexts: { page: number; text: string }[] = [];
      let currentPage = 0;

      const customPagerender = (pageData: any) => {
        currentPage++;
        const pageIndex = currentPage;
        return pageData.getTextContent().then((textContent: any) => {
          let lastY: any;
          let text = '';
          for (const item of textContent.items || []) {
            if (lastY === item.transform?.[5] || !lastY) {
              text += item.str;
            } else {
              text += '\n' + item.str;
            }
            lastY = item.transform?.[5];
          }
          const cleanedPage = text
            .replace(/\r\n/g, '\n')
            .replace(/[ \t]+/g, ' ')
            .trim();

          if (cleanedPage) {
            pageTexts.push({ page: pageIndex, text: cleanedPage });
          }
          return text;
        });
      };

      if (typeof pdfParseModule === 'function') {
        const result = await pdfParseModule(data, { pagerender: customPagerender });
        rawText = result?.text || '';
      } else if (typeof pdfParseModule?.PDFParse === 'function') {
        const parser = new pdfParseModule.PDFParse({ data });
        try {
          const result = await parser.getText();
          rawText = result?.text || '';
        } finally {
          await parser.destroy();
        }
      } else {
        throw new Error('PDF parsing library could not be initialized');
      }

      const fullCleaned = rawText
        .replace(/\r\n/g, '\n')
        .replace(/-- \d+ of \d+ --\n?/g, '')
        .trim();

      const segments: ExtractedSegment[] = [];

      if (pageTexts.length > 0) {
        for (const pt of pageTexts) {
          segments.push({
            contentType: 'document_text',
            text: pt.text,
            pageNumber: pt.page,
            sourceReference: `${filename} — Page ${pt.page}`,
            metadata: {
              page: pt.page,
              filename,
            },
          });
        }
      } else if (fullCleaned) {
        // Fallback if custom pagerender wasn't called (e.g. form feed splits)
        const rawPages = fullCleaned.split(/\f|\n{3,}--- Page \d+ ---\n{1,}/);
        rawPages.forEach((pageContent, idx) => {
          const trimmed = pageContent.trim();
          if (trimmed) {
            segments.push({
              contentType: 'document_text',
              text: trimmed,
              pageNumber: idx + 1,
              sourceReference: `${filename} — Page ${idx + 1}`,
              metadata: {
                page: idx + 1,
                filename,
              },
            });
          }
        });
      }

      const textOutput = fullCleaned || `[Notice: Text could not be extracted from "${filename}". The PDF may be empty or contains scanned/image-only pages.]`;

      return {
        fullText: textOutput,
        segments: segments.length > 0 ? segments : undefined,
        metadata: {
          totalPages: pageTexts.length || 1,
          filename,
        },
      };
    } catch (err: any) {
      this.logger.error(`Failed to extract text from PDF "${filename}": ${err.message}`);
      throw new Error(`PDF extraction failed: ${err.message}`);
    }
  }
}
