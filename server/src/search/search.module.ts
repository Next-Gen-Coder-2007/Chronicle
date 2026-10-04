import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentChunk } from '../entities/document-chunk.entity.js';
import { Document } from '../entities/document.entity.js';
import { File } from '../entities/file.entity.js';
import { DocumentModule } from '../document/document.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { SearchService } from './search.service.js';
import { SearchController } from './search.controller.js';
import { RerankerService } from './reranker.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentChunk, Document, File]),
    DocumentModule,
    AuthModule,
  ],
  controllers: [SearchController],
  providers: [SearchService, RerankerService],
  exports: [SearchService, RerankerService],
})
export class SearchModule {}
