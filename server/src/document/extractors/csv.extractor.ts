import { Injectable, Logger } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import type { DocumentExtractor } from './document-extractor.interface.js';

@Injectable()
export class CsvExtractor implements DocumentExtractor {
  private readonly logger = new Logger(CsvExtractor.name);

  supports(mimeType: string, filename?: string): boolean {
    if (
      mimeType === 'text/csv' ||
      mimeType === 'application/csv' ||
      mimeType === 'text/comma-separated-values'
    ) {
      return true;
    }
    if (filename && /\.csv$/i.test(filename)) {
      return true;
    }
    return false;
  }

  async extract(data: Buffer, filename: string): Promise<string> {
    try {
      const content = data.toString('utf-8');
      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });

      if (!Array.isArray(records) || records.length === 0) {
        return content.trim();
      }

      const formattedRows = (records as Record<string, any>[]).map((row) => {
        return Object.entries(row)
          .map(([header, value]) => `${header}: ${value ?? ''}`)
          .join('\n');
      });

      return formattedRows.join('\n\n').trim();
    } catch (err: any) {
      this.logger.warn(`Structured CSV parse failed for "${filename}", falling back to plain text: ${err.message}`);
      return data.toString('utf-8').replace(/\r\n/g, '\n').trim();
    }
  }
}
