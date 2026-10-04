import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Document } from '../entities/document.entity.js';
import { File } from '../entities/file.entity.js';
import { Content } from '../entities/content.entity.js';
import { DocumentExtractionService } from './document-extraction.service.js';
import { ChunkingService } from './chunking.service.js';
import { EmbeddingService } from './embedding.service.js';
import { STORAGE_SERVICE, type StorageService } from '../storage/storage.interface.js';
import {
  DOCUMENT_PROCESSING_QUEUE,
  PROCESS_DOCUMENT_JOB,
  type ProcessDocumentJobData,
} from './document.constants.js';
import type { DocumentChunk } from '../entities/document-chunk.entity.js';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
    private readonly extractionService: DocumentExtractionService,
    private readonly chunkingService: ChunkingService,
    private readonly embeddingService: EmbeddingService,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: StorageService,
    @InjectQueue(DOCUMENT_PROCESSING_QUEUE)
    private readonly documentQueue: Queue<ProcessDocumentJobData>,
  ) {}

  async findFileWithData(fileId: string): Promise<File> {
    const file = await this.fileRepository
      .createQueryBuilder('file')
      .addSelect('file.data')
      .where('file.id = :fileId', { fileId })
      .getOne();

    if (!file) {
      throw new NotFoundException(`File with ID "${fileId}" not found.`);
    }

    if ((!file.data || file.data.length === 0) && file.storageKey) {
      try {
        file.data = await this.storageService.get(file.storageKey);
      } catch (err: any) {
        this.logger.error(`Could not read storage key "${file.storageKey}": ${err.message}`);
      }
    }

    return file;
  }

  /**
   * BullMQ queue job dispatcher: Enqueues document for background multimodal ingestion.
   * If Redis is temporarily unavailable, gracefully executes in-process fallback.
   */
  async processDocument(
    documentId: string,
    binaryData?: Buffer,
    mimeType?: string,
    filename?: string,
  ): Promise<Document> {
    const doc = await this.documentRepository.findOne({
      where: { id: documentId },
      relations: { file: true },
    });

    if (!doc) {
      throw new NotFoundException(`Document "${documentId}" not found.`);
    }

    const resolvedMime = mimeType || doc.file?.mimeType || 'text/plain';
    const resolvedName = filename || doc.file?.filename || 'document';

    try {
      const job = await this.documentQueue.add(
        PROCESS_DOCUMENT_JOB,
        {
          documentId,
          mimeType: resolvedMime,
          filename: resolvedName,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      );

      this.logger.log(
        `[BullMQ] Enqueued job "${job.id}" for document "${documentId}" in queue "${DOCUMENT_PROCESSING_QUEUE}".`,
      );

      doc.status = 'pending';
      return await this.documentRepository.save(doc);
    } catch (err: any) {
      this.logger.warn(
        `[BullMQ] Could not enqueue to Redis (${err.message}). Executing in-process fallback.`,
      );
      return this.executeDocumentProcessing(documentId, binaryData, resolvedMime, resolvedName);
    }
  }

  /**
   * Worker Execution: Extracts multimodal content, normalizes Content entities,
   * performs semantic chunking, and computes vector embeddings.
   */
  async executeDocumentProcessing(
    documentId: string,
    binaryData?: Buffer,
    mimeType?: string,
    filename?: string,
  ): Promise<Document> {
    const doc = await this.documentRepository.findOne({
      where: { id: documentId },
      relations: { file: true },
    });

    if (!doc) {
      throw new NotFoundException(`Document "${documentId}" not found.`);
    }

    const resolvedMime = mimeType || doc.file?.mimeType || 'text/plain';
    const resolvedName = filename || doc.file?.filename || 'document';

    let dataBuffer = binaryData;
    if (!dataBuffer && doc.fileId) {
      const file = await this.findFileWithData(doc.fileId);
      dataBuffer = file.data;
    }

    if (!dataBuffer || dataBuffer.length === 0) {
      throw new BadRequestException(`No binary data available to process document "${documentId}".`);
    }

    try {
      doc.status = 'extracting';
      doc.processingError = undefined;
      await this.documentRepository.save(doc);

      this.logger.log(`Extracting multimodal content for document "${documentId}" (${resolvedName})...`);
      const extractionResult = await this.extractionService.extractDetailed(
        dataBuffer,
        resolvedMime,
        resolvedName,
      );

      doc.content = extractionResult.fullText;

      // Idempotently store normalized Content entities
      await this.contentRepository.delete({ documentId: doc.id });

      if (extractionResult.segments && extractionResult.segments.length > 0) {
        const contentEntities = extractionResult.segments.map((seg) =>
          this.contentRepository.create({
            documentId: doc.id,
            contentType: seg.contentType,
            text: seg.text,
            pageNumber: seg.pageNumber,
            startTimestamp: seg.startTimestamp,
            endTimestamp: seg.endTimestamp,
            sourceReference: seg.sourceReference,
            metadata: seg.metadata,
          }),
        );
        await this.contentRepository.save(contentEntities);
        this.logger.log(
          `Stored ${contentEntities.length} normalized Content segments for Document "${doc.id}".`,
        );
      }

      doc.status = 'chunking';
      await this.documentRepository.save(doc);

      this.logger.log(`Chunking document "${documentId}"...`);
      const chunks = await this.chunkingService.chunkDocument(doc.id);

      doc.status = 'embedding';
      await this.documentRepository.save(doc);

      this.logger.log(`Embedding ${chunks.length} chunks for document "${documentId}"...`);
      await this.embeddingService.embedChunks(chunks);

      doc.status = 'ready';
      doc.processingError = undefined;
      const finalDoc = await this.documentRepository.save(doc);

      this.logger.log(`Document processing completed successfully for "${documentId}".`);
      return finalDoc;
    } catch (err: any) {
      this.logger.error(`Document processing failed for "${documentId}": ${err.message}`);
      doc.status = 'failed';
      doc.processingError = err.message || 'Processing failed';
      await this.documentRepository.save(doc);
      throw err;
    }
  }

  async extractAndSave(fileId: string): Promise<Document> {
    const file = await this.findFileWithData(fileId);

    let document = await this.documentRepository.findOne({
      where: { fileId: file.id },
    });

    if (!document) {
      document = this.documentRepository.create({
        fileId: file.id,
        status: 'pending',
      });
      document = await this.documentRepository.save(document);
    }

    return this.processDocument(document.id, file.data, file.mimeType, file.filename);
  }

  async saveCustomContent(fileId: string, content: string): Promise<Document> {
    let document = await this.documentRepository.findOne({
      where: { fileId },
    });

    if (document) {
      document.content = content;
      document.status = 'chunking';
    } else {
      document = this.documentRepository.create({
        fileId,
        content,
        status: 'chunking',
      });
    }

    const savedDoc = await this.documentRepository.save(document);

    try {
      const chunks = await this.chunkingService.chunkDocument(savedDoc.id);
      savedDoc.status = 'embedding';
      await this.documentRepository.save(savedDoc);
      await this.embeddingService.embedChunks(chunks);
      savedDoc.status = 'ready';
      await this.documentRepository.save(savedDoc);
    } catch (err: any) {
      this.logger.error(`Chunk / embedding generation failed for custom document "${savedDoc.id}": ${err.message}`);
      savedDoc.status = 'failed';
      savedDoc.processingError = err.message;
      await this.documentRepository.save(savedDoc);
    }

    return savedDoc;
  }

  async getChunks(documentId: string): Promise<DocumentChunk[]> {
    return this.chunkingService.getChunksForDocument(documentId);
  }

  async getChunksForDocument(documentId: string): Promise<DocumentChunk[]> {
    return this.chunkingService.getChunksForDocument(documentId);
  }

  async getContents(documentId: string): Promise<Content[]> {
    return this.contentRepository.find({
      where: { documentId },
      order: {
        pageNumber: 'ASC',
        startTimestamp: 'ASC',
      },
    });
  }

  async getDocumentById(id: string): Promise<Document> {
    const doc = await this.documentRepository.findOne({
      where: { id },
      relations: { file: true },
    });

    if (!doc) {
      throw new NotFoundException(`Document with ID "${id}" not found.`);
    }

    return doc;
  }

  async getQueueStats(): Promise<Record<string, number>> {
    try {
      const counts = await this.documentQueue.getJobCounts();
      return counts;
    } catch (err: any) {
      this.logger.warn(`Could not fetch BullMQ queue stats: ${err.message}`);
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    }
  }
}
