import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Document } from './document.entity.js';
import { DocumentChunk } from './document-chunk.entity.js';

const isPostgres =
  process.env.DATABASE_URL?.startsWith('postgres://') ||
  process.env.DATABASE_URL?.startsWith('postgresql://');

@Entity('contents')
@Index(['documentId', 'contentType'])
export class Content {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id' })
  @Index()
  documentId: string;

  @ManyToOne(() => Document, (doc) => doc.contents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document?: Relation<Document>;

  @Column({
    name: 'content_type',
    type: 'varchar',
    length: 50,
    default: 'document_text',
  })
  contentType:
    | 'document_text'
    | 'image_description'
    | 'ocr'
    | 'audio_transcript'
    | 'video_transcript'
    | 'video_scene';

  @Column({ type: 'text' })
  text: string;

  @Column({
    type: isPostgres ? 'jsonb' : 'simple-json',
    nullable: true,
  })
  metadata?: Record<string, any>;

  @Column({ name: 'source_reference', nullable: true })
  sourceReference?: string;

  @Column({ name: 'page_number', type: 'int', nullable: true })
  pageNumber?: number;

  @Column({ name: 'start_timestamp', type: 'float', nullable: true })
  startTimestamp?: number;

  @Column({ name: 'end_timestamp', type: 'float', nullable: true })
  endTimestamp?: number;

  @OneToMany(() => DocumentChunk, (chunk) => chunk.contentEntity, { cascade: true })
  chunks?: Relation<DocumentChunk[]>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
