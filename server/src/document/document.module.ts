import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../entities/document.entity.js';
import { File } from '../entities/file.entity.js';
import { DocumentChunk } from '../entities/document-chunk.entity.js';
import { DocumentService } from './document.service.js';
import { DocumentExtractionService } from './document-extraction.service.js';
import { ChunkingService } from './chunking.service.js';
import { EmbeddingService } from './embedding.service.js';
import { TextExtractor } from './extractors/text.extractor.js';
import { PdfExtractor } from './extractors/pdf.extractor.js';
import { DocxExtractor } from './extractors/docx.extractor.js';
import { CsvExtractor } from './extractors/csv.extractor.js';
import { JsonExtractor } from './extractors/json.extractor.js';
import { HtmlExtractor } from './extractors/html.extractor.js';
import { ImageExtractor } from './extractors/image.extractor.js';
import { AudioExtractor } from './extractors/audio.extractor.js';
import { VideoExtractor } from './extractors/video.extractor.js';

@Module({
  imports: [TypeOrmModule.forFeature([Document, File, DocumentChunk])],
  providers: [
    TextExtractor,
    PdfExtractor,
    DocxExtractor,
    CsvExtractor,
    JsonExtractor,
    HtmlExtractor,
    ImageExtractor,
    AudioExtractor,
    VideoExtractor,
    DocumentExtractionService,
    ChunkingService,
    EmbeddingService,
    DocumentService,
  ],
  exports: [
    DocumentService,
    DocumentExtractionService,
    ChunkingService,
    EmbeddingService,
    TypeOrmModule,
  ],
})
export class DocumentModule {}
