import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Memory } from './memory.entity.js';
import { Document } from './document.entity.js';
import { User } from './user.entity.js';

const isPostgres =
  process.env.DATABASE_URL?.startsWith('postgres://') ||
  process.env.DATABASE_URL?.startsWith('postgresql://');

@Entity('files')
export class File {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'filename' })
  filename: string;

  @Column({ name: 'storage_key', nullable: true })
  @Index()
  storageKey?: string;

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
  @Index()
  memoryId: string;

  @ManyToOne(() => Memory, (memory) => memory.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memory_id' })
  memory?: Relation<Memory>;

  @Column({ name: 'user_id', nullable: true })
  @Index()
  userId?: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: Relation<User>;

  @OneToOne(() => Document, (document) => document.file, { cascade: true })
  document?: Relation<Document>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
