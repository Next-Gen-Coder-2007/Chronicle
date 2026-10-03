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
} from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '../auth/jwt.strategy.js';
import { MemoryService } from './memory.service.js';
import { CreateMemoryDto } from './dto/create-memory.dto.js';
import { UpdateMemoryDto } from './dto/update-memory.dto.js';

@Controller('memories')
@UseGuards(JwtAuthGuard)
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

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

  @Delete(':id')
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.memoryService.remove(userId, id);
  }
}
