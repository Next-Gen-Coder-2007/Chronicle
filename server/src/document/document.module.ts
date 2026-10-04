import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Document } from '../entities/document.entity.js';
import { File } from '../entities/file.entity.js';
import { DocumentChunk } from '../entities/document-chunk.entity.js';
import { Content } from '../entities/content.entity.js';
import { DocumentService } from './document.service.js';
import { DocumentController } from './document.controller.js';
import { DocumentExtractionService } from './document-extraction.service.js';
import { ChunkingService } from './chunking.service.js';
import { EmbeddingService } from './embedding.service.js';
import { StorageModule } from '../storage/storage.module.js';
import { TextExtractor } from './extractors/text.extractor.js';
import { PdfExtractor } from './extractors/pdf.extractor.js';
import { DocxExtractor } from './extractors/docx.extractor.js';
import { CsvExtractor } from './extractors/csv.extractor.js';
import { JsonExtractor } from './extractors/json.extractor.js';
import { HtmlExtractor } from './extractors/html.extractor.js';
import { ImageExtractor } from './extractors/image.extractor.js';
import { AudioExtractor } from './extractors/audio.extractor.js';
import { VideoExtractor } from './extractors/video.extractor.js';
import { DocumentProcessor } from './document.processor.js';
import { DOCUMENT_PROCESSING_QUEUE } from './document.constants.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, File, DocumentChunk, Content]),
    StorageModule,
    BullModule.registerQueue({
      name: DOCUMENT_PROCESSING_QUEUE,
    }),
  ],
  controllers: [DocumentController],
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
    DocumentProcessor,
  ],
  exports: [
    DocumentService,
    DocumentExtractionService,
    ChunkingService,
    EmbeddingService,
    DocumentProcessor,
    TypeOrmModule,
    BullModule,
  ],
})
export class DocumentModule {}
