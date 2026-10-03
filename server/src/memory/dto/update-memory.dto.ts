import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateMemoryDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  started?: string;

  @IsString()
  @IsOptional()
  ended?: string;

  @IsString()
  @IsOptional()
  @IsIn(['ongoing', 'completed'], {
    message: 'Status must be either ongoing or completed',
  })
  status?: 'ongoing' | 'completed';

  @IsString()
  @IsOptional()
  location?: string;

  @IsOptional()
  tags?: string[];

  @IsOptional()
  media?: any[];
}
