import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from './auth/auth.module.js';
import { MemoryModule } from './memory/memory.module.js';
import { DocumentModule } from './document/document.module.js';
import { SearchModule } from './search/search.module.js';
import { RagModule } from './rag/rag.module.js';
import { StorageModule } from './storage/storage.module.js';

const dbUrl = process.env.DATABASE_URL || 'sqlite://chronicle.sqlite';
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: Number(config.get<number>('REDIS_PORT', 6379)),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          maxRetriesPerRequest: null,
        },
      }),
    }),
    StorageModule,
    TypeOrmModule.forRoot(
      isPostgres
        ? {
            type: 'postgres',
            url: dbUrl,
            autoLoadEntities: true,
            synchronize: true,
            ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
          }
        : {
            type: 'better-sqlite3',
            database: dbUrl.replace(/^sqlite:\/\//, '') || 'chronicle.sqlite',
            autoLoadEntities: true,
            synchronize: true,
          },
    ),
    AuthModule,
    MemoryModule,
    DocumentModule,
    SearchModule,
    RagModule,
  ],
})
export class AppModule {}
