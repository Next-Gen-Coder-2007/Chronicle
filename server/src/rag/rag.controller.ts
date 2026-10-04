import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '../auth/jwt.strategy.js';
import { RagService } from './rag.service.js';
import { ChatRequestDto } from './dto/chat-request.dto.js';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post()
  async chat(
    @CurrentUser('id') userId: string,
    @Body() dto: ChatRequestDto,
  ) {
    if (!dto.message || !dto.message.trim()) {
      throw new BadRequestException('Message is required.');
    }

    const result = await this.ragService.chat({
      message: dto.message,
      memoryId: dto.memoryId,
      userId,
      history: dto.history,
      limit: dto.limit,
      minSimilarity: dto.minSimilarity,
    });

    return {
      success: true,
      data: result,
    };
  }

  @Post('memory/:id')
  async chatWithMemory(
    @CurrentUser('id') userId: string,
    @Param('id') memoryId: string,
    @Body() dto: ChatRequestDto,
  ) {
    if (!dto.message || !dto.message.trim()) {
      throw new BadRequestException('Message is required.');
    }

    const result = await this.ragService.chat({
      message: dto.message,
      memoryId,
      userId,
      history: dto.history,
      limit: dto.limit,
      minSimilarity: dto.minSimilarity,
    });

    return {
      success: true,
      data: result,
    };
  }
}
