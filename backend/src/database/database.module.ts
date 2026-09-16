import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import pg from 'pg';
import { DatabaseService } from './database.service.js';
import { DatabaseConfig } from '../config/database.config.js';

/**
 * Tự động kiểm tra và tạo database PostgreSQL nếu chưa tồn tại.
 */
async function ensureDatabaseExists(options: any, logger: Logger) {
  if (options.url) return;
  const targetDb = options.database;
  if (!targetDb || targetDb === 'postgres') return;

  const client = new pg.Client({
    host: options.host || 'localhost',
    port: options.port || 5432,
    user: options.username || 'postgres',
    password: options.password,
    database: 'postgres',
    ssl: options.ssl,
  });

  try {
    await client.connect();
    const res = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [targetDb],
    );
    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE "${targetDb}"`);
      logger.log(`🛠️  Đã tự động khởi tạo database "${targetDb}"`);
    }
  } catch {
    // Bỏ qua lỗi kết nối database mặc định để TypeORM xử lý
  } finally {
    await client.end().catch(() => {});
  }
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get<DatabaseConfig>('database');

        if (!dbConfig) {
          throw new Error(
            'Không tìm thấy cấu hình database từ ConfigService (namespace "database").',
          );
        }

        const poolConfig = {
          max: dbConfig.pool.max,
          min: dbConfig.pool.min,
          idleTimeoutMillis: dbConfig.pool.idleTimeoutMillis,
          connectionTimeoutMillis: dbConfig.pool.connectionTimeoutMillis,
          application_name: 'classroom-hub-backend',
        };

        // Cách 1: Sử dụng DATABASE_URL nếu có
        if (dbConfig.url && dbConfig.url.trim() !== '') {
          return {
            type: 'postgres',
            url: dbConfig.url,
            autoLoadEntities: true,
            synchronize: dbConfig.synchronize,
            logging: dbConfig.logging,
            ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,
            extra: poolConfig,
            retryAttempts: 2,
            retryDelay: 3000,
          };
        }

        // Cách 2: Sử dụng các biến cấu hình riêng lẻ
        return {
          type: 'postgres',
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.database,
          autoLoadEntities: true,
          synchronize: dbConfig.synchronize,
          logging: dbConfig.logging,
          ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,
          extra: poolConfig,
          retryAttempts: 2,
          retryDelay: 3000,
        };
      },
      dataSourceFactory: async (options) => {
        const logger = new Logger('Database');
        if (!options) {
          throw new Error(
            'Cấu hình TypeORM không hợp lệ (options is undefined).',
          );
        }

        // Tự động kiểm tra và tạo database nếu chưa có
        await ensureDatabaseExists(options, logger);

        const dataSource = new DataSource(options);
        try {
          await dataSource.initialize();
          return dataSource;
        } catch (error: any) {
          logger.error(`❌ Lỗi kết nối PostgreSQL: ${error?.message || error}`);
          throw error;
        }
      },
    }),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService, TypeOrmModule],
})
export class DatabaseModule {}
