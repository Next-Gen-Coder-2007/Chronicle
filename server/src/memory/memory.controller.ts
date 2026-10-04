import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  Req,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { JwtAuthGuard, CurrentUser, Public } from '../auth/jwt.strategy.js';
import { MemoryService } from './memory.service.js';
import { SearchService } from '../search/search.service.js';
import { CreateMemoryDto } from './dto/create-memory.dto.js';
import { UpdateMemoryDto } from './dto/update-memory.dto.js';

import { RagService } from '../rag/rag.service.js';

@Controller('memories')
@UseGuards(JwtAuthGuard)
export class MemoryController {
  constructor(
    private readonly memoryService: MemoryService,
    private readonly searchService: SearchService,
    private readonly ragService: RagService,
  ) {}

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() createMemoryDto: CreateMemoryDto,
  ) {
    const memory = await this.memoryService.create(userId, createMemoryDto);
    return {
      success: true,
      message: 'Memory created successfully',
      data: memory,
    };
  }

  @Get('recent')
  async findRecent(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 5;
    const memories = await this.memoryService.findRecent(userId, limitNum);
    return {
      success: true,
      data: memories,
    };
  }

  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('recent') recent?: string,
    @Query('limit') limit?: string,
  ) {
    if (recent === 'true') {
      const limitNum = limit ? parseInt(limit, 10) : 5;
      const memories = await this.memoryService.findRecent(userId, limitNum);
      return {
        success: true,
        data: memories,
      };
    }

    const memories = await this.memoryService.findAll(userId);
    return {
      success: true,
      data: memories,
    };
  }

  @Get(':id')
  async findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const memory = await this.memoryService.findOne(userId, id);
    return {
      success: true,
      data: memory,
    };
  }

  @Patch(':id')
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateMemoryDto: UpdateMemoryDto,
  ) {
    const memory = await this.memoryService.update(userId, id, updateMemoryDto);
    return {
      success: true,
      message: 'Memory updated successfully',
      data: memory,
    };
  }

  @Put(':id')
  async updatePut(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateMemoryDto: UpdateMemoryDto,
  ) {
    const memory = await this.memoryService.update(userId, id, updateMemoryDto);
    return {
      success: true,
      message: 'Memory updated successfully',
      data: memory,
    };
  }

  @Post(':id/media')
  async addMedia(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { name: string; url?: string; type: string; size?: number; content?: string },
  ) {
    const memory = await this.memoryService.addMedia(userId, id, body);
    return {
      success: true,
      message: 'Attachment added successfully',
      data: memory,
    };
  }

  @Patch(':id/media/:mediaId')
  async updateMedia(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
    @Body() body: { name?: string; filename?: string; content?: string },
  ) {
    const memory = await this.memoryService.updateMedia(userId, id, mediaId, body);
    return {
      success: true,
      message: 'Attachment updated successfully',
      data: memory,
    };
  }

  @Delete(':id/media/:mediaId')
  async removeMedia(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
  ) {
    const memory = await this.memoryService.removeMedia(userId, id, mediaId);
    return {
      success: true,
      message: 'Media deleted successfully',
      data: memory,
    };
  }

  @Delete(':id')
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.memoryService.remove(userId, id);
  }

  @Get(':id/files/:fileId')
  async getFile(
    @CurrentUser('id') userId: string,
    @Param('id') memoryId: string,
    @Param('fileId') fileId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const file = await this.memoryService.getFileData(userId, memoryId, fileId);
    if (!file || !file.data) {
      throw new NotFoundException('File not found');
    }

    const totalSize = file.data.length;
    const mimeType = file.mimeType || 'application/octet-stream';
    const range = req.headers.range;

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.filename)}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (start >= totalSize || end >= totalSize) {
        res.status(416).setHeader('Content-Range', `bytes */${totalSize}`);
        return res.end();
      }

      const chunk = file.data.subarray(start, end + 1);
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
      res.setHeader('Content-Length', chunk.length);
      res.setHeader('Content-Type', mimeType);
      return res.end(chunk);
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', totalSize);
    return res.end(file.data);
  }

  @Get(':id/search')
  async searchMemory(
    @CurrentUser('id') userId: string,
    @Param('id') memoryId: string,
    @Query('q') query?: string,
    @Query('query') queryAlt?: string,
    @Query('limit') limit?: string,
    @Query('minSimilarity') minSimilarity?: string,
  ) {
    const searchText = (query || queryAlt || '').trim();
    if (!searchText) {
      throw new BadRequestException('Search query is required.');
    }

    const limitNum = limit ? parseInt(limit, 10) : undefined;
    const minSimNum = minSimilarity ? parseFloat(minSimilarity) : undefined;

    const results = await this.searchService.search(searchText, {
      memoryId,
      userId,
      limit: limitNum,
      minSimilarity: minSimNum,
    });

    return {
      success: true,
      query: searchText,
      memoryId,
      count: results.length,
      data: results,
    };
  }

  @Get(':id/summary')
  async getSummary(
    @CurrentUser('id') userId: string,
    @Param('id') memoryId: string,
  ) {
    const summary = await this.ragService.generateMemorySummary(userId, memoryId);
    return {
      success: true,
      data: summary,
    };
  }
}
