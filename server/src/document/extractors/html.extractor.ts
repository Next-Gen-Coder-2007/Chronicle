import { Injectable } from '@nestjs/common';
import { convert } from 'html-to-text';
import type { DocumentExtractor } from './document-extractor.interface.js';

@Injectable()
export class HtmlExtractor implements DocumentExtractor {
  supports(mimeType: string, filename?: string): boolean {
    if (
      mimeType === 'text/html' ||
      mimeType === 'application/xhtml+xml'
    ) {
      return true;
    }
    if (filename && /\.(html|htm|xhtml)$/i.test(filename)) {
      return true;
    }
    return false;
  }

  async extract(data: Buffer): Promise<string> {
    const rawHtml = data.toString('utf-8');

    const cleanText = convert(rawHtml, {
      wordwrap: false,
      selectors: [
        { selector: 'script', format: 'skip' },
        { selector: 'style', format: 'skip' },
        { selector: 'head', format: 'skip' },
        { selector: 'noscript', format: 'skip' },
        { selector: 'iframe', format: 'skip' },
        { selector: 'nav', format: 'skip' },
        { selector: 'footer', format: 'skip' },
        { selector: 'h1', options: { uppercase: false } },
        { selector: 'h2', options: { uppercase: false } },
        { selector: 'h3', options: { uppercase: false } },
        { selector: 'h4', options: { uppercase: false } },
        { selector: 'h5', options: { uppercase: false } },
        { selector: 'h6', options: { uppercase: false } },
        { selector: 'a', options: { ignoreHref: true } },
      ],
    });

    return cleanText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }
}
