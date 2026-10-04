import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '../auth/jwt.strategy.js';
import { SearchService } from './search.service.js';
import { SearchQueryDto } from './dto/search-query.dto.js';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async searchGet(
    @CurrentUser('id') userId: string,
    @Query() queryDto: SearchQueryDto,
  ) {
    const searchText = (queryDto.q || queryDto.query || '').trim();
    if (!searchText) {
      throw new BadRequestException('Search query is required.');
    }

    const limit = queryDto.limit ? Number(queryDto.limit) : undefined;
    const minSimilarity = queryDto.minSimilarity
      ? Number(queryDto.minSimilarity)
      : undefined;

    const results = await this.searchService.search(searchText, {
      userId,
      memoryId: queryDto.memoryId,
      limit,
      minSimilarity,
    });

    return {
      success: true,
      query: searchText,
      count: results.length,
      data: results,
    };
  }

  @Post()
  async searchPost(
    @CurrentUser('id') userId: string,
    @Body() body: SearchQueryDto,
  ) {
    const searchText = (body.query || body.q || '').trim();
    if (!searchText) {
      throw new BadRequestException('Search query is required.');
    }

    const limit = body.limit ? Number(body.limit) : undefined;
    const minSimilarity = body.minSimilarity
      ? Number(body.minSimilarity)
      : undefined;

    const results = await this.searchService.search(searchText, {
      userId,
      memoryId: body.memoryId,
      limit,
      minSimilarity,
    });

    return {
      success: true,
      query: searchText,
      count: results.length,
      data: results,
    };
  }
}
