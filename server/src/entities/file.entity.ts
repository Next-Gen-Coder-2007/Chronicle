import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Memory } from './memory.entity.js';
import { Document } from './document.entity.js';

const isPostgres =
  process.env.DATABASE_URL?.startsWith('postgres://') ||
  process.env.DATABASE_URL?.startsWith('postgresql://');

@Entity('files')
export class File {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'filename' })
  filename: string;
  
  @Column({ name: 'mime_type' })
  mimeType: string;

  @Column({ type: 'int' })
  size: number;

  @Column({
    type: isPostgres ? 'bytea' : 'blob',
    nullable: true,
    select: false,
  })
  data?: Buffer;

  @Column({ name: 'memory_id' })
  memoryId: string;

  @ManyToOne(() => Memory, (memory) => memory.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memory_id' })
  memory?: Relation<Memory>;

  @OneToOne(() => Document, (document) => document.file, { cascade: true })
  document?: Relation<Document>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
