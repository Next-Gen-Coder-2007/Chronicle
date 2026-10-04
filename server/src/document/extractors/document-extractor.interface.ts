export type NormalizedContentType =
  | 'document_text'
  | 'image_description'
  | 'ocr'
  | 'audio_transcript'
  | 'video_transcript'
  | 'video_scene';

export interface ExtractedSegment {
  contentType: NormalizedContentType;
  text: string;
  pageNumber?: number;
  startTimestamp?: number;
  endTimestamp?: number;
  speaker?: string;
  sourceReference?: string;
  metadata?: Record<string, any>;
}

export interface ExtractionResult {
  fullText: string;
  segments?: ExtractedSegment[];
  metadata?: Record<string, any>;
}

export interface DocumentExtractor {
  supports(mimeType: string, filename?: string): boolean;

  extract(
    data: Buffer,
    filename: string,
    mimeType?: string,
  ): Promise<string>;

  extractStructured?(
    data: Buffer,
    filename: string,
    mimeType?: string,
  ): Promise<ExtractionResult>;
}
