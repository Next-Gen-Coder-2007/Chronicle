import {
  Injectable,
  BadRequestException,
  UnsupportedMediaTypeException,
  Logger,
} from '@nestjs/common';
import type { DocumentExtractor } from './extractors/document-extractor.interface.js';
import { TextExtractor } from './extractors/text.extractor.js';
import { PdfExtractor } from './extractors/pdf.extractor.js';
import { DocxExtractor } from './extractors/docx.extractor.js';
import { CsvExtractor } from './extractors/csv.extractor.js';
import { JsonExtractor } from './extractors/json.extractor.js';
import { HtmlExtractor } from './extractors/html.extractor.js';
import { ImageExtractor } from './extractors/image.extractor.js';
import { AudioExtractor } from './extractors/audio.extractor.js';
import { VideoExtractor } from './extractors/video.extractor.js';

@Injectable()
export class DocumentExtractionService {
  private readonly logger = new Logger(DocumentExtractionService.name);
  private readonly extractors: DocumentExtractor[];

  constructor(
    textExtractor: TextExtractor,
    pdfExtractor: PdfExtractor,
    docxExtractor: DocxExtractor,
    csvExtractor: CsvExtractor,
    jsonExtractor: JsonExtractor,
    htmlExtractor: HtmlExtractor,
    imageExtractor: ImageExtractor,
    audioExtractor: AudioExtractor,
    videoExtractor: VideoExtractor,
  ) {
    this.extractors = [
      videoExtractor,
      audioExtractor,
      imageExtractor,
      pdfExtractor,
      docxExtractor,
      csvExtractor,
      jsonExtractor,
      htmlExtractor,
      textExtractor,
    ];
  }

  canExtract(mimeType: string, filename?: string): boolean {
    return this.extractors.some((extractor) => extractor.supports(mimeType, filename));
  }

  async extract(
    data: Buffer | undefined | null,
    mimeType: string,
    filename: string,
  ): Promise<string> {
    if (!data || data.length === 0) {
      throw new BadRequestException(
        `Cannot extract content from file "${filename}": file data buffer is empty or missing.`,
      );
    }

    const extractor = this.extractors.find((e) => e.supports(mimeType, filename));

    if (!extractor) {
      throw new UnsupportedMediaTypeException(
        `Unsupported media type "${mimeType}" for file "${filename}". Supported extractable formats: Video (MP4, WebM, QuickTime, AVI, MKV, WMV, FLV), Audio (MP3, WAV, M4A, OGG, FLAC, AAC, WebM), Images (JPEG, PNG, WebP, GIF), TXT, PDF, DOCX, CSV, JSON, HTML.`,
      );
    }

    try {
      this.logger.log(`Extracting content from "${filename}" (${mimeType})...`);
      const extractedText = await extractor.extract(data, filename, mimeType);

      const cleanedText = extractedText
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      return cleanedText;
    } catch (err: any) {
      this.logger.error(`Extraction failed for "${filename}": ${err.message}`);
      throw new BadRequestException(`Document extraction failed for "${filename}": ${err.message}`);
    }
  }
}
