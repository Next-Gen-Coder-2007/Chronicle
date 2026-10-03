import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMemoryDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  description: string;

  @IsString()
  @IsNotEmpty({ message: 'Started date is required' })
  started: string;

  @IsString()
  @IsOptional()
  ended?: string;

  @IsString()
  @IsIn(['ongoing', 'completed'], {
    message: 'Status must be either ongoing or completed',
  })
  status: 'ongoing' | 'completed';

  @IsString()
  @IsOptional()
  location?: string;
}
