import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard, CurrentUser } from '../auth/jwt.strategy.js';
import { DocumentService } from './document.service.js';
import { Document } from '../entities/document.entity.js';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
  ) {}

  @Get('queue/stats')
  async getQueueStats() {
    const stats = await this.documentService.getQueueStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Get(':id')
  async getOne(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const doc = await this.documentRepository
      .createQueryBuilder('doc')
      .innerJoinAndSelect('doc.file', 'file')
      .innerJoin('file.memory', 'memory')
      .leftJoinAndSelect('doc.contents', 'contents')
      .leftJoinAndSelect('doc.chunks', 'chunks')
      .where('doc.id = :id AND memory.user_id = :userId', { id, userId })
      .getOne();

    if (!doc) {
      throw new NotFoundException(`Document "${id}" not found.`);
    }

    return {
      success: true,
      data: doc,
    };
  }

  @Get(':id/status')
  async getStatus(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const doc = await this.documentRepository
      .createQueryBuilder('doc')
      .innerJoin('doc.file', 'file')
      .innerJoin('file.memory', 'memory')
      .select(['doc.id', 'doc.status', 'doc.processingError', 'doc.updatedAt'])
      .where('doc.id = :id AND memory.user_id = :userId', { id, userId })
      .getOne();

    if (!doc) {
      throw new NotFoundException(`Document "${id}" not found.`);
    }

    return {
      success: true,
      data: {
        id: doc.id,
        status: doc.status,
        processingError: doc.processingError,
        updatedAt: doc.updatedAt,
      },
    };
  }

  @Post(':id/reprocess')
  async reprocess(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const doc = await this.documentRepository
      .createQueryBuilder('doc')
      .innerJoin('doc.file', 'file')
      .innerJoin('file.memory', 'memory')
      .where('doc.id = :id AND memory.user_id = :userId', { id, userId })
      .getOne();

    if (!doc) {
      throw new NotFoundException(`Document "${id}" not found.`);
    }

    // Trigger processing
    this.documentService
      .processDocument(doc.id)
      .catch((err) => {
        // Logged inside documentService
      });

    return {
      success: true,
      message: 'Document reprocessing initiated.',
      data: {
        id: doc.id,
        status: 'extracting',
      },
    };
  }

  @Get(':id/chunks')
  async getChunks(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const doc = await this.documentRepository
      .createQueryBuilder('doc')
      .innerJoin('doc.file', 'file')
      .innerJoin('file.memory', 'memory')
      .where('doc.id = :id AND memory.user_id = :userId', { id, userId })
      .getOne();

    if (!doc) {
      throw new NotFoundException(`Document "${id}" not found.`);
    }

    const chunks = await this.documentService.getChunksForDocument(id);
    return {
      success: true,
      count: chunks.length,
      data: chunks,
    };
  }
}
