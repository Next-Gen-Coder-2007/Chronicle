import { IsString, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchQueryDto {
  @IsString()
  @IsOptional()
  query?: string;

  @IsString()
  @IsOptional()
  q?: string;

  @IsString()
  @IsOptional()
  memoryId?: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  limit?: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  minSimilarity?: number;
}
