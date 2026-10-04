import { Module } from '@nestjs/common';
import { SearchModule } from '../search/search.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { RagService } from './rag.service.js';
import { RagController } from './rag.controller.js';

@Module({
  imports: [SearchModule, AuthModule],
  controllers: [RagController],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
