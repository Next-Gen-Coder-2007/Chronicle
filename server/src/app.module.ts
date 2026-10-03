import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import { MemoryModule } from './memory/memory.module.js';

const dbUrl = process.env.DATABASE_URL || 'sqlite://chronicle.sqlite';
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
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
  ],
})
export class AppModule {}
