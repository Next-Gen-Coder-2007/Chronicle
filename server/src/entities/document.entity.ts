import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { File } from './file.entity.js';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({ name: 'file_id', unique: true })
  fileId: string;

  @OneToOne(() => File, (file) => file.document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file?: Relation<File>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
