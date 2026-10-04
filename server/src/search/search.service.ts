import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import pgvector from 'pgvector';
import { EmbeddingService } from '../document/embedding.service.js';
import { DocumentChunk } from '../entities/document-chunk.entity.js';
import { RerankerService } from './reranker.service.js';

export interface SearchResultChunk {
  id: string;
  content: string;
  chunkIndex: number;
  charCount: number;
  tokenCount?: number;
  similarity: number;
  metadata?: Record<string, any>;
  documentId: string;
  fileId?: string;
  filename?: string;
  mimeType?: string;
  memoryId?: string;
  pageNumber?: number;
  startTimestamp?: number;
  endTimestamp?: number;
  contentId?: string;
  contentType?: string;
}

export interface SearchOptions {
  memoryId?: string;
  userId?: string;
  limit?: number;
  minSimilarity?: number;
  queryText?: string;
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @InjectRepository(DocumentChunk)
    private readonly chunkRepository: Repository<DocumentChunk>,
    private readonly embeddingService: EmbeddingService,
    private readonly rerankerService: RerankerService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    const dbUrl =
      this.configService.get<string>('DATABASE_URL') ||
      process.env.DATABASE_URL ||
      '';
    const isPostgres =
      dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

    if (isPostgres) {
      try {
        await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS vector;');
        await this.dataSource.query(
          'CREATE INDEX IF NOT EXISTS document_chunks_embedding_cosine_idx ON document_chunks USING hnsw (embedding vector_cosine_ops);',
        );
        await this.dataSource.query(
          "CREATE INDEX IF NOT EXISTS document_chunks_content_tsv_idx ON document_chunks USING gin (to_tsvector('english', content));",
        );
        this.logger.log('pgvector HNSW index and full-text GIN index verified on document_chunks.');
      } catch (err: any) {
        this.logger.warn(`Could not verify pgvector/GIN indexes: ${err.message}`);
      }
    }
  }

  async search(
    query: string,
    options?: SearchOptions,
  ): Promise<SearchResultChunk[]> {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query cannot be empty.');
    }

    const queryEmbedding = await this.embeddingService.generateEmbedding(query);
    const candidateLimit = Math.max(30, (options?.limit ?? 10) * 3);

    const candidates = await this.searchByVector(queryEmbedding, {
      ...options,
      limit: candidateLimit,
      queryText: query,
    });

    // Apply multi-factor reranking to initial candidates
    return this.rerankerService.rerank(query, candidates, {
      topK: options?.limit ?? 10,
      minScore: options?.minSimilarity,
    });
  }

  async searchByVector(
    embedding: number[],
    options?: SearchOptions,
  ): Promise<SearchResultChunk[]> {
    if (!embedding || embedding.length === 0) {
      throw new BadRequestException('Query embedding vector cannot be empty.');
    }

    const limit = Math.min(100, Math.max(1, options?.limit ?? 10));
    const minSimilarity = options?.minSimilarity;
    const memoryId = options?.memoryId?.trim() || undefined;
    const userId = options?.userId?.trim() || undefined;
    const queryText = options?.queryText;

    const dbUrl =
      this.configService.get<string>('DATABASE_URL') ||
      process.env.DATABASE_URL ||
      '';
    const isPostgres =
      dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

    if (isPostgres) {
      return this.searchPostgres(embedding, {
        memoryId,
        userId,
        limit,
        minSimilarity,
        queryText,
      });
    }

    return this.searchFallback(embedding, {
      memoryId,
      userId,
      limit,
      minSimilarity,
      queryText,
    });
  }

  async searchMemory(
    memoryId: string,
    query: string,
    limit?: number,
  ): Promise<SearchResultChunk[]> {
    return this.search(query, { memoryId, limit });
  }

  private computeHybridScore(
    similarity: number,
    content: string,
    filename?: string,
    queryText?: string,
  ): number {
    if (!queryText || !queryText.trim()) return similarity;
    const terms = queryText
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .filter((t) => t.length > 2);
    if (terms.length === 0) return similarity;

    const contentLower = (content || '').toLowerCase();
    const filenameLower = (filename || '').toLowerCase();

    let matchedTerms = 0;
    for (const term of terms) {
      if (contentLower.includes(term) || filenameLower.includes(term)) {
        matchedTerms++;
      }
    }

    const lexicalRatio = matchedTerms / terms.length;
    const combined = similarity * 0.65 + lexicalRatio * 0.35;
    return Number(combined.toFixed(6));
  }

  private async searchPostgres(
    embedding: number[],
    options: {
      memoryId?: string;
      userId?: string;
      limit: number;
      minSimilarity?: number;
      queryText?: string;
    },
  ): Promise<SearchResultChunk[]> {
    const vectorSql = pgvector.toSql(embedding);
    const conditions: string[] = ['chunk.embedding IS NOT NULL'];
    const params: any[] = [vectorSql];

    if (options.memoryId) {
      params.push(options.memoryId);
      conditions.push(`file.memory_id = $${params.length}`);
    } else if (options.userId) {
      params.push(options.userId);
      conditions.push(
        `file.memory_id IN (SELECT m.id FROM memories m WHERE m.user_id = $${params.length})`,
      );
    }

    const fetchLimit = Math.max(30, options.limit * 2);
    params.push(fetchLimit);
    const limitIndex = params.length;

    const sql = `
      SELECT 
        chunk.id AS id,
        chunk.content AS content,
        chunk.chunk_index AS "chunkIndex",
        chunk.char_count AS "charCount",
        chunk.token_count AS "tokenCount",
        chunk.page_number AS "pageNumber",
        chunk.start_timestamp AS "startTimestamp",
        chunk.end_timestamp AS "endTimestamp",
        chunk.content_id AS "contentId",
        chunk.metadata AS metadata,
        chunk.document_id AS "documentId",
        (1 - (chunk.embedding <=> $1::vector)) AS similarity,
        doc.file_id AS "fileId",
        file.filename AS filename,
        file.mime_type AS "mimeType",
        file.memory_id AS "memoryId"
      FROM document_chunks chunk
      INNER JOIN documents doc ON doc.id = chunk.document_id
      INNER JOIN files file ON file.id = doc.file_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY chunk.embedding <=> $1::vector ASC
      LIMIT $${limitIndex};
    `;

    const rawResults: any[] = await this.dataSource.query(sql, params);

    const scored: SearchResultChunk[] = rawResults.map((row) => {
      const rawSim = parseFloat(row.similarity);
      const hybridSim = this.computeHybridScore(
        rawSim,
        row.content,
        row.filename,
        options.queryText,
      );

      const parsedMeta =
        typeof row.metadata === 'string'
          ? JSON.parse(row.metadata)
          : row.metadata;

      return {
        id: row.id,
        content: row.content,
        chunkIndex: Number(row.chunkIndex),
        charCount: Number(row.charCount),
        tokenCount:
          row.tokenCount !== null ? Number(row.tokenCount) : undefined,
        pageNumber: row.pageNumber !== null ? Number(row.pageNumber) : undefined,
        startTimestamp:
          row.startTimestamp !== null ? Number(row.startTimestamp) : undefined,
        endTimestamp:
          row.endTimestamp !== null ? Number(row.endTimestamp) : undefined,
        contentId: row.contentId || undefined,
        contentType: parsedMeta?.contentType,
        similarity: hybridSim,
        metadata: parsedMeta,
        documentId: row.documentId,
        fileId: row.fileId,
        filename: row.filename,
        mimeType: row.mimeType,
        memoryId: row.memoryId,
      };
    });

    const filtered =
      options.minSimilarity !== undefined
        ? scored.filter((s) => s.similarity >= options.minSimilarity!)
        : scored;

    filtered.sort((a, b) => b.similarity - a.similarity);
    return filtered.slice(0, options.limit);
  }

  private async searchFallback(
    embedding: number[],
    options: {
      memoryId?: string;
      userId?: string;
      limit: number;
      minSimilarity?: number;
      queryText?: string;
    },
  ): Promise<SearchResultChunk[]> {
    const queryBuilder = this.chunkRepository
      .createQueryBuilder('chunk')
      .innerJoinAndSelect('chunk.document', 'doc')
      .innerJoinAndSelect('doc.file', 'file')
      .where('chunk.embedding IS NOT NULL');

    if (options.memoryId) {
      queryBuilder.andWhere('file.memoryId = :memoryId', {
        memoryId: options.memoryId,
      });
    } else if (options.userId) {
      queryBuilder
        .innerJoin('file.memory', 'memory')
        .andWhere('memory.userId = :userId', { userId: options.userId });
    }

    const chunks = await queryBuilder.getMany();
    const scoredChunks: SearchResultChunk[] = [];

    for (const chunk of chunks) {
      let chunkEmbedding = chunk.embedding;
      if (typeof chunkEmbedding === 'string') {
        try {
          chunkEmbedding = JSON.parse(chunkEmbedding);
        } catch {
          continue;
        }
      }

      if (!Array.isArray(chunkEmbedding) || chunkEmbedding.length === 0) {
        continue;
      }

      const cosineSim = this.computeCosineSimilarity(embedding, chunkEmbedding);
      const filename = chunk.document?.file?.filename;
      const hybridSim = this.computeHybridScore(
        cosineSim,
        chunk.content,
        filename,
        options.queryText,
      );

      if (
        options.minSimilarity !== undefined &&
        hybridSim < options.minSimilarity
      ) {
        continue;
      }

      scoredChunks.push({
        id: chunk.id,
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        charCount: chunk.charCount,
        tokenCount: chunk.tokenCount,
        pageNumber: chunk.pageNumber,
        startTimestamp: chunk.startTimestamp,
        endTimestamp: chunk.endTimestamp,
        contentId: chunk.contentId,
        contentType: chunk.metadata?.contentType,
        similarity: hybridSim,
        metadata: chunk.metadata,
        documentId: chunk.documentId,
        fileId: chunk.document?.fileId || (chunk.document?.file as any)?.id,
        filename,
        mimeType: chunk.document?.file?.mimeType,
        memoryId: chunk.document?.file?.memoryId,
      });
    }

    scoredChunks.sort((a, b) => b.similarity - a.similarity);
    return scoredChunks.slice(0, options.limit);
  }

  private computeCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;
    return dotProduct / denominator;
  }
}
