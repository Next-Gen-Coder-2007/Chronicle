import { Injectable, Inject, NotFoundException, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Memory } from '../entities/memory.entity.js';
import { File } from '../entities/file.entity.js';
import { Document } from '../entities/document.entity.js';
import { CreateMemoryDto } from './dto/create-memory.dto.js';
import { UpdateMemoryDto } from './dto/update-memory.dto.js';
import { DocumentExtractionService } from '../document/document-extraction.service.js';
import { ChunkingService } from '../document/chunking.service.js';
import { EmbeddingService } from '../document/embedding.service.js';
import { DocumentService } from '../document/document.service.js';
import { STORAGE_SERVICE, type StorageService } from '../storage/storage.interface.js';

@Injectable()
export class MemoryService implements OnModuleInit {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    @InjectRepository(Memory)
    private readonly memoryRepository: Repository<Memory>,
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly extractionService: DocumentExtractionService,
    private readonly chunkingService: ChunkingService,
    private readonly embeddingService: EmbeddingService,
    private readonly documentService: DocumentService,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: StorageService,
  ) {}

  async onModuleInit() {
    try {
      const filesWithoutDoc = await this.fileRepository
        .createQueryBuilder('file')
        .leftJoinAndSelect('file.document', 'document')
        .where('document.id IS NULL')
        .getMany();

      for (const file of filesWithoutDoc) {
        const doc = this.documentRepository.create({
          content: '',
          fileId: file.id,
        });
        await this.documentRepository.save(doc);
      }
    } catch {
    }
  }

  private formatMemory(memory: Memory): any {
    const backendBase = process.env.BACKEND_URL || 'http://localhost:5000';
    const files = memory.files || [];
    const media = files.map((file) => {
      const isNote = file.mimeType === 'note' || file.filename === 'Note';
      return {
        id: file.id,
        name: file.filename,
        url: !isNote ? `${backendBase}/memories/${memory.id}/files/${file.id}` : undefined,
        type: file.mimeType,
        size: file.size,
        content: isNote ? (file.document?.content || undefined) : undefined,
        status: file.document?.status || 'ready',
        processingError: file.document?.processingError || undefined,
        uploadedAt: file.createdAt instanceof Date ? file.createdAt.toISOString() : String(file.createdAt),
      };
    });

    const cleanFiles = files.map((f) => {
      const { data, document, ...rest } = f as any;
      return rest;
    });

    return {
      ...memory,
      files: cleanFiles,
      media,
    };
  }

  async create(userId: string, dto: CreateMemoryDto): Promise<any> {
    const { media, ...data } = dto as any;
    const memory = this.memoryRepository.create({
      ...data,
      userId,
    } as Partial<Memory>);
    const saved = await this.memoryRepository.save(memory);
    const savedId = (saved as Memory).id;
    return this.findOne(userId, savedId);
  }

  async findAll(userId: string): Promise<any[]> {
    const memories = await this.memoryRepository.find({
      where: { userId },
      relations: { files: { document: true } },
      order: { createdAt: 'DESC' },
    });
    return memories.map((m) => this.formatMemory(m));
  }

  async findRecent(userId: string, limit: number = 5): Promise<any[]> {
    const memories = await this.memoryRepository.find({
      where: { userId },
      relations: { files: { document: true } },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return memories.map((m) => this.formatMemory(m));
  }

  async findOne(userId: string, id: string): Promise<any> {
    const memory = await this.memoryRepository.findOne({
      where: { id, userId },
      relations: { files: { document: true } },
    });
    if (!memory) {
      throw new NotFoundException(`Memory with id "${id}" not found`);
    }
    return this.formatMemory(memory);
  }

  async update(userId: string, id: string, dto: UpdateMemoryDto): Promise<any> {
    const memory = await this.memoryRepository.findOne({
      where: { id, userId },
      relations: { files: { document: true } },
    });
    if (!memory) {
      throw new NotFoundException(`Memory with id "${id}" not found`);
    }
    const { media, ...data } = dto as any;
    Object.assign(memory, data);
    if (dto.status === 'ongoing') {
      memory.ended = null as any;
    }
    await this.memoryRepository.save(memory);
    return this.findOne(userId, id);
  }

  async addMedia(
    userId: string,
    id: string,
    mediaItem: { name: string; url?: string; type: string; size?: number; content?: string },
  ): Promise<any> {
    const memory = await this.memoryRepository.findOne({
      where: { id, userId },
      relations: { files: { document: true } },
    });
    if (!memory) {
      throw new NotFoundException(`Memory with id "${id}" not found`);
    }

    const isNote = mediaItem.type === 'note' || mediaItem.name === 'Note';
    const isImage =
      Boolean(mediaItem.type && mediaItem.type.startsWith('image/')) ||
      /\.(jpe?g|png|gif|webp|svg|bmp|ico|tiff)$/i.test(mediaItem.name || '');
    const isAudio =
      Boolean(mediaItem.type && mediaItem.type.startsWith('audio/')) ||
      /\.(mp3|wav|ogg|m4a|aac|flac|wma)$/i.test(mediaItem.name || '');
    const isVideo =
      Boolean(mediaItem.type && mediaItem.type.startsWith('video/')) ||
      /\.(mp4|webm|mov|mkv|avi|wmv|flv|m4v)$/i.test(mediaItem.name || '');
    const isDocument = this.extractionService.canExtract(mediaItem.type || '', mediaItem.name || '');

    if (!isNote && !isImage && !isAudio && !isVideo && !isDocument) {
      throw new BadRequestException(
        `Unsupported file type. Allowed files are images, audio, video, and documents (PDF, DOCX, TXT, CSV, JSON, HTML).`,
      );
    }

    const maxSizeBytes = isVideo ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
    const limitLabel = isVideo ? '20MB' : '5MB';

    if (mediaItem.size && mediaItem.size > maxSizeBytes) {
      throw new BadRequestException(
        `File size exceeds limit (${limitLabel}). Allowed: up to 20MB for video, 5MB for other attachments.`,
      );
    }

    if (mediaItem.url && mediaItem.url.startsWith('data:')) {
      const approxSizeBytes = Math.floor((mediaItem.url.length - mediaItem.url.indexOf(',')) * 0.75);
      if (approxSizeBytes > maxSizeBytes + 1024 * 1024) {
        throw new BadRequestException(
          `File payload exceeds ${limitLabel} limit.`,
        );
      }
    }

    let binaryData: Buffer | undefined;
    if (mediaItem.url && mediaItem.url.includes(',')) {
      const base64Part = mediaItem.url.split(',')[1];
      if (base64Part) {
        binaryData = Buffer.from(base64Part, 'base64');
      }
    } else if (mediaItem.content && (!mediaItem.url || mediaItem.type === 'note')) {
      binaryData = Buffer.from(mediaItem.content, 'utf-8');
    }

    let mimeType = isNote ? 'note' : mediaItem.type;
    if (!mimeType || mimeType === 'application/octet-stream') {
      if (isNote) mimeType = 'note';
      else if (isVideo) {
        if (/\.webm$/i.test(mediaItem.name || '')) mimeType = 'video/webm';
        else if (/\.mov$/i.test(mediaItem.name || '')) mimeType = 'video/quicktime';
        else if (/\.avi$/i.test(mediaItem.name || '')) mimeType = 'video/x-msvideo';
        else if (/\.mkv$/i.test(mediaItem.name || '')) mimeType = 'video/x-matroska';
        else if (/\.wmv$/i.test(mediaItem.name || '')) mimeType = 'video/x-ms-wmv';
        else if (/\.flv$/i.test(mediaItem.name || '')) mimeType = 'video/x-flv';
        else if (/\.3gp$/i.test(mediaItem.name || '')) mimeType = 'video/3gpp';
        else mimeType = 'video/mp4';
      }
      else if (isAudio) {
        if (/\.wav$/i.test(mediaItem.name || '')) mimeType = 'audio/wav';
        else if (/\.ogg$/i.test(mediaItem.name || '')) mimeType = 'audio/ogg';
        else if (/\.flac$/i.test(mediaItem.name || '')) mimeType = 'audio/flac';
        else if (/\.m4a$/i.test(mediaItem.name || '')) mimeType = 'audio/mp4';
        else if (/\.aac$/i.test(mediaItem.name || '')) mimeType = 'audio/aac';
        else if (/\.webm$/i.test(mediaItem.name || '')) mimeType = 'audio/webm';
        else mimeType = 'audio/mpeg';
      } else if (isImage) {
        if (/\.png$/i.test(mediaItem.name || '')) mimeType = 'image/png';
        else if (/\.webp$/i.test(mediaItem.name || '')) mimeType = 'image/webp';
        else if (/\.gif$/i.test(mediaItem.name || '')) mimeType = 'image/gif';
        else if (/\.svg$/i.test(mediaItem.name || '')) mimeType = 'image/svg+xml';
        else mimeType = 'image/jpeg';
      }
      else if (/\.pdf$/i.test(mediaItem.name || '')) mimeType = 'application/pdf';
      else if (/\.docx$/i.test(mediaItem.name || '')) mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (/\.doc$/i.test(mediaItem.name || '')) mimeType = 'application/msword';
      else if (/\.csv$/i.test(mediaItem.name || '')) mimeType = 'text/csv';
      else if (/\.json$/i.test(mediaItem.name || '')) mimeType = 'application/json';
      else if (/\.html?$/i.test(mediaItem.name || '')) mimeType = 'text/html';
      else mimeType = 'text/plain';
    }

    let storageKey: string | undefined;
    if (binaryData && binaryData.length > 0) {
      try {
        const safeName = (mediaItem.name || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_');
        const key = `memories/${memory.id}/${Date.now()}-${safeName}`;
        const stored = await this.storageService.save(key, binaryData, mimeType);
        storageKey = stored.storageKey;
      } catch (err: any) {
        this.logger.warn(`Could not save file to disk storage: ${err.message}`);
      }
    }

    const file = this.fileRepository.create({
      filename: mediaItem.name || (isNote ? 'Note' : 'Attachment'),
      mimeType,
      size: mediaItem.size || (binaryData ? binaryData.length : 0),
      data: binaryData,
      storageKey,
      userId,
      memoryId: memory.id,
    });
    const savedFile = await this.fileRepository.save(file);

    const shouldExtract = Boolean(
      binaryData &&
      binaryData.length > 0 &&
      this.extractionService.canExtract(mimeType, file.filename),
    );

    let docContent = '';
    if (isNote && mediaItem.content) {
      docContent = mediaItem.content;
    }

    const document = this.documentRepository.create({
      content: docContent || undefined,
      fileId: savedFile.id,
      status: shouldExtract ? 'processing' : 'ready',
    });
    const savedDoc = await this.documentRepository.save(document);

    if (isNote && docContent && docContent.trim().length > 0) {
      this.chunkingService
        .chunkDocument(savedDoc.id)
        .then((chunks) => this.embeddingService.embedChunks(chunks))
        .catch((err: any) => {
          this.logger.error(`Automatic chunking/embedding failed for note "${savedDoc.id}": ${err.message}`);
        });
    }

    if (shouldExtract && binaryData) {
      this.documentService
        .processDocument(savedDoc.id, binaryData, mimeType, file.filename)
        .catch((err: any) => {
          this.logger.error(`Document processing failed for "${savedDoc.id}": ${err.message}`);
        });
    }

    return this.findOne(userId, id);
  }

  async updateMedia(
    userId: string,
    id: string,
    mediaId: string,
    data: { name?: string; filename?: string; content?: string },
  ): Promise<any> {
    const memory = await this.memoryRepository.findOne({
      where: { id, userId },
      relations: { files: { document: true } },
    });
    if (!memory) {
      throw new NotFoundException(`Memory with id "${id}" not found`);
    }

    const file = await this.fileRepository.findOne({
      where: { id: mediaId, memoryId: memory.id },
      relations: { document: true },
    });
    if (!file) {
      throw new NotFoundException(`File with id "${mediaId}" not found`);
    }

    const newName = (data.name || data.filename || '').trim();
    if (newName) {
      file.filename = newName;
      await this.fileRepository.save(file);
    }

    if (data.content !== undefined) {
      let savedDoc: Document;
      if (file.document) {
        file.document.content = data.content;
        savedDoc = await this.documentRepository.save(file.document);
      } else {
        const doc = this.documentRepository.create({
          content: data.content,
          fileId: file.id,
        });
        savedDoc = await this.documentRepository.save(doc);
      }

      try {
        const chunks = await this.chunkingService.chunkDocument(savedDoc.id);
        await this.embeddingService.embedChunks(chunks);
      } catch (err: any) {
        this.logger.error(`Automatic chunking/embedding failed for updated document "${savedDoc.id}": ${err.message}`);
      }
    }

    return this.findOne(userId, id);
  }

  async removeMedia(userId: string, id: string, mediaId: string): Promise<any> {
    const memory = await this.memoryRepository.findOne({
      where: { id, userId },
      relations: { files: { document: true } },
    });
    if (!memory) {
      throw new NotFoundException(`Memory with id "${id}" not found`);
    }

    const file = await this.fileRepository.findOne({
      where: { id: mediaId, memoryId: memory.id },
    });
    if (file) {
      await this.fileRepository.remove(file);
    }

    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string): Promise<{ success: boolean; message: string }> {
    const memory = await this.memoryRepository.findOne({
      where: { id, userId },
    });
    if (!memory) {
      throw new NotFoundException(`Memory with id "${id}" not found`);
    }
    await this.memoryRepository.remove(memory);
    return { success: true, message: 'Memory deleted successfully' };
  }

  async getFileData(userId: string, memoryId: string, fileId: string): Promise<File | null> {
    const file = await this.fileRepository
      .createQueryBuilder('file')
      .innerJoin('file.memory', 'memory')
      .addSelect('file.data')
      .where('file.id = :fileId AND file.memory_id = :memoryId AND memory.user_id = :userId', {
        fileId,
        memoryId,
        userId,
      })
      .getOne();

    if (file && (!file.data || file.data.length === 0) && file.storageKey) {
      try {
        file.data = await this.storageService.get(file.storageKey);
      } catch (err: any) {
        this.logger.error(`Failed to load file from storageKey "${file.storageKey}": ${err.message}`);
      }
    }

    return file;
  }
}
