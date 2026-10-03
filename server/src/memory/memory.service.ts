import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Memory } from '../entities/memory.entity.js';
import { CreateMemoryDto } from './dto/create-memory.dto.js';
import { UpdateMemoryDto } from './dto/update-memory.dto.js';

@Injectable()
export class MemoryService {
  constructor(
    @InjectRepository(Memory)
    private readonly memoryRepository: Repository<Memory>,
  ) {}

  async create(userId: string, dto: CreateMemoryDto): Promise<Memory> {
    const memory = this.memoryRepository.create({
      ...dto,
      userId,
    });
    return this.memoryRepository.save(memory);
  }

  async findAll(userId: string): Promise<Memory[]> {
    return this.memoryRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findRecent(userId: string, limit: number = 5): Promise<Memory[]> {
    return this.memoryRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findOne(userId: string, id: string): Promise<Memory> {
    const memory = await this.memoryRepository.findOne({
      where: { id, userId },
    });
    if (!memory) {
      throw new NotFoundException(`Memory with id "${id}" not found`);
    }
    return memory;
  }

  async update(userId: string, id: string, dto: UpdateMemoryDto): Promise<Memory> {
    const memory = await this.findOne(userId, id);
    Object.assign(memory, dto);
    if (dto.status === 'ongoing') {
      memory.ended = null as any;
    }
    return this.memoryRepository.save(memory);
  }

  async addMedia(
    userId: string,
    id: string,
    mediaItem: { name: string; url?: string; type: string; size?: number; content?: string },
  ): Promise<Memory> {
    const memory = await this.findOne(userId, id);
    const mediaList = memory.media || [];
    const newMedia = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: mediaItem.name || 'Attachment',
      url: mediaItem.url || '',
      type: mediaItem.type || 'file',
      size: mediaItem.size,
      content: mediaItem.content,
      uploadedAt: new Date().toISOString(),
    };
    memory.media = [...mediaList, newMedia];
    return this.memoryRepository.save(memory);
  }

  async removeMedia(userId: string, id: string, mediaId: string): Promise<Memory> {
    const memory = await this.findOne(userId, id);
    if (memory.media) {
      memory.media = memory.media.filter((m) => m.id !== mediaId);
    }
    return this.memoryRepository.save(memory);
  }

  async remove(userId: string, id: string): Promise<{ success: boolean; message: string }> {
    const memory = await this.findOne(userId, id);
    await this.memoryRepository.remove(memory);
    return { success: true, message: 'Memory deleted successfully' };
  }
}
