import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Memory } from '../entities/memory.entity.js';
import { File } from '../entities/file.entity.js';
import { Document } from '../entities/document.entity.js';
import { MemoryService } from './memory.service.js';
import { MemoryController } from './memory.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { DocumentModule } from '../document/document.module.js';
import { SearchModule } from '../search/search.module.js';
import { RagModule } from '../rag/rag.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Memory, File, Document]),
    AuthModule,
    DocumentModule,
    SearchModule,
    RagModule,
  ],
  controllers: [MemoryController],
  providers: [MemoryService],
  exports: [MemoryService],
})
export class MemoryModule {}
