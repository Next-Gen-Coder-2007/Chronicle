import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { GoogleGenAI } from '@google/genai';
import { DocumentChunk } from '../entities/document-chunk.entity.js';

@Injectable()
export class EmbeddingService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingService.name);
  private static readonly DEFAULT_MODEL = 'gemini-embedding-001';
  private static readonly DIMENSIONS = 768;
  private static readonly BATCH_SIZE = 25;

  constructor(
    @InjectRepository(DocumentChunk)
    private readonly chunkRepository: Repository<DocumentChunk>,
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
        this.logger.log('pgvector extension verified in PostgreSQL.');
      } catch (err: any) {
        this.logger.warn(`Could not verify pgvector extension: ${err.message}`);
      }
    }
  }

  private getClient(): { ai: GoogleGenAI; model: string } {
    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new InternalServerErrorException(
        'Gemini API key is not configured. Set GEMINI_API_KEY to generate embeddings.',
      );
    }

    const model =
      this.configService.get<string>('EMBEDDING_MODEL') ||
      process.env.EMBEDDING_MODEL ||
      EmbeddingService.DEFAULT_MODEL;

    return {
      ai: new GoogleGenAI({ apiKey }),
      model,
    };
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new BadRequestException('Cannot generate embedding for empty text.');
    }

    const { ai, model } = this.getClient();

    try {
      const response = await ai.models.embedContent({
        model,
        contents: text.trim(),
        config: {
          outputDimensionality: EmbeddingService.DIMENSIONS,
        },
      });

      const embeddingValues = response.embeddings?.[0]?.values;
      if (!embeddingValues || embeddingValues.length === 0) {
        throw new Error('Embedding provider returned empty vector values.');
      }

      return embeddingValues;
    } catch (err: any) {
      const apiKey =
        this.configService.get<string>('GEMINI_API_KEY') ||
        process.env.GEMINI_API_KEY ||
        '';
      const sanitized = (err.message || 'Unknown error').replace(
        new RegExp(apiKey, 'gi'),
        '[REDACTED_API_KEY]',
      );
      this.logger.error(`Embedding generation failed: ${sanitized}`);
      throw new BadRequestException(`Embedding generation failed: ${sanitized}`);
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    const { ai, model } = this.getClient();
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += EmbeddingService.BATCH_SIZE) {
      const batch = texts
        .slice(i, i + EmbeddingService.BATCH_SIZE)
        .map((t) => (t && t.trim().length > 0 ? t.trim() : ' '));

      try {
        const response = await ai.models.embedContent({
          model,
          contents: batch,
          config: {
            outputDimensionality: EmbeddingService.DIMENSIONS,
          },
        });

        const batchResults = response.embeddings || [];
        for (let j = 0; j < batch.length; j++) {
          const vals = batchResults[j]?.values;
          if (!vals || vals.length === 0) {
            throw new Error(`Embedding missing for item at index ${i + j}.`);
          }
          allEmbeddings.push(vals);
        }
      } catch (err: any) {
        const apiKey =
          this.configService.get<string>('GEMINI_API_KEY') ||
          process.env.GEMINI_API_KEY ||
          '';
        const sanitized = (err.message || 'Unknown error').replace(
          new RegExp(apiKey, 'gi'),
          '[REDACTED_API_KEY]',
        );
        this.logger.error(`Batch embedding generation failed: ${sanitized}`);
        throw new BadRequestException(
          `Batch embedding generation failed: ${sanitized}`,
        );
      }
    }

    return allEmbeddings;
  }

  async embedChunks(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
    if (!chunks || chunks.length === 0) {
      return [];
    }

    const validChunks = chunks.filter(
      (c) => c.content && c.content.trim().length > 0,
    );

    if (validChunks.length === 0) {
      return chunks;
    }

    this.logger.log(
      `Generating embeddings for ${validChunks.length} document chunks...`,
    );

    const texts = validChunks.map((c) => c.content);
    const embeddings = await this.generateEmbeddings(texts);

    for (let i = 0; i < validChunks.length; i++) {
      validChunks[i].embedding = embeddings[i];
    }

    const saved = await this.chunkRepository.save(validChunks);
    this.logger.log(
      `Successfully saved embeddings for ${saved.length} chunks.`,
    );

    return saved;
  }

  async embedDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
    const chunks = await this.chunkRepository.find({
      where: { documentId },
      order: { chunkIndex: 'ASC' },
    });

    if (!chunks || chunks.length === 0) {
      this.logger.warn(
        `No chunks found to embed for document id "${documentId}".`,
      );
      return [];
    }

    return this.embedChunks(chunks);
  }
}
