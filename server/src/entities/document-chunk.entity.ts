import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Document } from './document.entity.js';
import { Content } from './content.entity.js';

const isPostgres =
  process.env.DATABASE_URL?.startsWith('postgres://') ||
  process.env.DATABASE_URL?.startsWith('postgresql://');

const vectorTransformer = {
  to: (value: number[] | null | undefined) => {
    if (!value) return null;
    return typeof value === 'string' ? value : JSON.stringify(value);
  },
  from: (value: string | number[] | null | undefined): number[] | null => {
    if (!value) return null;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        if (value.startsWith('[') && value.endsWith(']')) {
          return JSON.parse(value);
        }
      } catch {
        return value.replace(/^\[|\]$/g, '').split(',').map(Number);
      }
    }
    return null;
  },
};

@Entity('document_chunks')
@Index(['documentId', 'chunkIndex'])
export class DocumentChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'chunk_index', type: 'int' })
  chunkIndex: number;

  @Column({ name: 'char_count', type: 'int', default: 0 })
  charCount: number;

  @Column({ name: 'token_count', type: 'int', nullable: true })
  tokenCount?: number;

  @Column({
    type: isPostgres ? 'vector' : 'simple-json',
    length: isPostgres ? 768 : undefined,
    nullable: true,
    transformer: isPostgres ? vectorTransformer : undefined,
  })
  embedding?: number[];

  @Column({
    type: isPostgres ? 'jsonb' : 'simple-json',
    nullable: true,
  })
  metadata?: {
    section?: string;
    startChar?: number;
    endChar?: number;
    totalChunks?: number;
    mimeType?: string;
    filename?: string;
    pageNumber?: number;
    startTimestamp?: number;
    endTimestamp?: number;
    speaker?: string;
    [key: string]: any;
  };

  @Column({ name: 'page_number', type: 'int', nullable: true })
  @Index()
  pageNumber?: number;

  @Column({ name: 'start_timestamp', type: 'float', nullable: true })
  @Index()
  startTimestamp?: number;

  @Column({ name: 'end_timestamp', type: 'float', nullable: true })
  endTimestamp?: number;

  @Column({ name: 'content_id', nullable: true })
  @Index()
  contentId?: string;

  @ManyToOne(() => Content, (content) => content.chunks, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'content_id' })
  contentEntity?: Relation<Content>;

  @Column({ name: 'document_id' })
  @Index()
  documentId: string;

  @ManyToOne(() => Document, (doc) => doc.chunks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document?: Relation<Document>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
