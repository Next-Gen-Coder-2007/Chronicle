import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Memory } from '../entities/memory.entity.js';
import { SearchModule } from '../search/search.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { RagService } from './rag.service.js';
import { RagController } from './rag.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Memory]),
    SearchModule,
    AuthModule,
  ],
  controllers: [RagController],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
