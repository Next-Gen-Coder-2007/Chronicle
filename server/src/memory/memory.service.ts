import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Memory } from '../entities/memory.entity.js';
import { File } from '../entities/file.entity.js';
import { Document } from '../entities/document.entity.js';
import { CreateMemoryDto } from './dto/create-memory.dto.js';
import { UpdateMemoryDto } from './dto/update-memory.dto.js';

@Injectable()
export class MemoryService implements OnModuleInit {
  constructor(
    @InjectRepository(Memory)
    private readonly memoryRepository: Repository<Memory>,
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
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
      // Ignored if table not ready
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
        content: file.document?.content || undefined,
        uploadedAt: file.createdAt instanceof Date ? file.createdAt.toISOString() : String(file.createdAt),
      };
    });

    const cleanFiles = files.map((f) => {
      const { data, ...rest } = f as any;
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

    const isVideo =
      Boolean(mediaItem.type && mediaItem.type.startsWith('video/')) ||
      /\.(mp4|webm|mov|mkv|avi|wmv|flv)$/i.test(mediaItem.name || '');

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

    const isNote = mediaItem.type === 'note' || mediaItem.name === 'Note';
    const mimeType = isNote
      ? 'note'
      : mediaItem.type || (isVideo ? 'video/mp4' : 'application/octet-stream');

    const file = this.fileRepository.create({
      filename: mediaItem.name || (isNote ? 'Note' : 'Attachment'),
      mimeType,
      size: mediaItem.size || (binaryData ? binaryData.length : 0),
      data: binaryData,
      memoryId: memory.id,
    });

    const savedFile = await this.fileRepository.save(file);

    let docContent = mediaItem.content || '';
    if (!docContent && binaryData && binaryData.length > 0) {
      const isTextFile =
        (mimeType && mimeType.startsWith('text/')) ||
        /\.(txt|md|markdown|json|csv|tsv|html|xml|log|yaml|yml|sql|js|ts|py)$/i.test(file.filename);

      if (isTextFile) {
        try {
          docContent = binaryData.toString('utf-8').trim();
        } catch {
          docContent = '';
        }
      }
    }

    const document = this.documentRepository.create({
      content: docContent,
      fileId: savedFile.id,
    });
    await this.documentRepository.save(document);

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
      if (file.document) {
        file.document.content = data.content;
        await this.documentRepository.save(file.document);
      } else {
        const doc = this.documentRepository.create({
          content: data.content,
          fileId: file.id,
        });
        await this.documentRepository.save(doc);
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
    return this.fileRepository
      .createQueryBuilder('file')
      .innerJoin('file.memory', 'memory')
      .addSelect('file.data')
      .where('file.id = :fileId AND file.memory_id = :memoryId AND memory.user_id = :userId', {
        fileId,
        memoryId,
        userId,
      })
      .getOne();
  }
}
