import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { File } from './file.entity.js';
import { DocumentChunk } from './document-chunk.entity.js';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'ready',
  })
  status: 'pending' | 'processing' | 'ready' | 'failed';

  @Column({ name: 'processing_error', type: 'text', nullable: true })
  processingError?: string;

  @Column({ name: 'file_id', unique: true })
  fileId: string;

  @OneToOne(() => File, (file) => file.document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file?: Relation<File>;

  @OneToMany(() => DocumentChunk, (chunk) => chunk.document, { cascade: true })
  chunks?: Relation<DocumentChunk[]>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
