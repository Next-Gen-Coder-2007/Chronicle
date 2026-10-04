import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from './user.entity.js';
import { File } from './file.entity.js';

@Entity('memories')
export class Memory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  started: string;

  @Column({ nullable: true })
  ended?: string;

  @Column({ default: 'ongoing' })
  status: 'ongoing' | 'completed';

  @Column({ nullable: true })
  location?: string;

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  @OneToMany(() => File, (file) => file.memory, { cascade: true })
  files?: Relation<File[]>;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: Relation<User>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
