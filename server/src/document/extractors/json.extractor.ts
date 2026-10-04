import { Injectable } from '@nestjs/common';
import type { DocumentExtractor } from './document-extractor.interface.js';

@Injectable()
export class JsonExtractor implements DocumentExtractor {
  supports(mimeType: string, filename?: string): boolean {
    if (
      mimeType === 'application/json' ||
      mimeType === 'text/json' ||
      mimeType === 'application/ld+json'
    ) {
      return true;
    }
    if (filename && /\.json$/i.test(filename)) {
      return true;
    }
    return false;
  }

  async extract(data: Buffer, filename: string): Promise<string> {
    const raw = data.toString('utf-8');
    try {
      const parsed = JSON.parse(raw);
      return this.formatJsonValue(parsed, 0).trim();
    } catch {
      throw new Error(`Invalid JSON syntax in file "${filename}"`);
    }
  }

  private formatJsonValue(value: unknown, indent = 0): string {
    const indentStr = '  '.repeat(indent);

    if (value === null) return 'null';
    if (value === undefined) return '';
    if (typeof value !== 'object') return String(value);

    if (Array.isArray(value)) {
      if (value.length === 0) return '[]';
      return value
        .map((item) => {
          if (typeof item === 'object' && item !== null) {
            return `${indentStr}-\n${this.formatJsonValue(item, indent + 1)}`;
          }
          return `${indentStr}- ${this.formatJsonValue(item, 0)}`;
        })
        .join('\n');
    }

    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '{}';

    return entries
      .map(([key, val]) => {
        if (typeof val === 'object' && val !== null) {
          if (Array.isArray(val)) {
            return `${indentStr}${key}:\n${this.formatJsonValue(val, indent)}`;
          }
          return `${indentStr}${key}:\n${this.formatJsonValue(val, indent + 1)}`;
        }
        return `${indentStr}${key}: ${this.formatJsonValue(val, 0)}`;
      })
      .join('\n');
  }
}
