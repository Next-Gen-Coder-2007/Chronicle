import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../entities/document.entity.js';
import { File } from '../entities/file.entity.js';
import { DocumentExtractionService } from './document-extraction.service.js';
import { ChunkingService } from './chunking.service.js';
import { EmbeddingService } from './embedding.service.js';
import type { DocumentChunk } from '../entities/document-chunk.entity.js';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    private readonly extractionService: DocumentExtractionService,
    private readonly chunkingService: ChunkingService,
    private readonly embeddingService: EmbeddingService,
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

    return file;
  }

  async extractAndSave(fileId: string): Promise<Document> {
    const file = await this.findFileWithData(fileId);

    if (!file.data || file.data.length === 0) {
      throw new BadRequestException(`File "${file.filename}" contains no binary data to extract.`);
    }

    const content = await this.extractionService.extract(
      file.data,
      file.mimeType,
      file.filename,
    );

    let document = await this.documentRepository.findOne({
      where: { fileId: file.id },
    });

    if (document) {
      document.content = content;
    } else {
      document = this.documentRepository.create({
        fileId: file.id,
        content,
      });
    }

    const savedDoc = await this.documentRepository.save(document);
    this.logger.log(`Extracted and stored ${content.length} characters in Document for file "${file.filename}" (fileId: ${file.id})`);

    try {
      const chunks = await this.chunkingService.chunkDocument(savedDoc.id);
      await this.embeddingService.embedChunks(chunks);
    } catch (err: any) {
      this.logger.error(`Chunk / embedding generation failed for document "${savedDoc.id}": ${err.message}`);
    }

    return savedDoc;
  }

  async saveCustomContent(fileId: string, content: string): Promise<Document> {
    let document = await this.documentRepository.findOne({
      where: { fileId },
    });

    if (document) {
      document.content = content;
    } else {
      document = this.documentRepository.create({
        fileId,
        content,
      });
    }

    const savedDoc = await this.documentRepository.save(document);

    try {
      const chunks = await this.chunkingService.chunkDocument(savedDoc.id);
      await this.embeddingService.embedChunks(chunks);
    } catch (err: any) {
      this.logger.error(`Chunk / embedding generation failed for document "${savedDoc.id}": ${err.message}`);
    }

    return savedDoc;
  }

  async findByFileId(fileId: string): Promise<Document | null> {
    return this.documentRepository.findOne({
      where: { fileId },
      relations: { chunks: true },
    });
  }

  async getChunksForDocument(documentId: string): Promise<DocumentChunk[]> {
    return this.chunkingService.getChunksForDocument(documentId);
  }

  async chunkDocument(documentId: string): Promise<DocumentChunk[]> {
    return this.chunkingService.chunkDocument(documentId);
  }

  async embedDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
    return this.embeddingService.embedDocumentChunks(documentId);
  }
}
