import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService?: ConfigService) {
    const connectionString =
      configService?.get<string>('DATABASE_URL') ||
      process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        'DATABASE_URL is not configured. Please define DATABASE_URL in your environment or .env file.',
      );
    }

    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Kết nối cơ sở dữ liệu PostgreSQL thành công qua Prisma 7 Driver Adapter.');
    } catch (err: any) {
      this.logger.error(`❌ Lỗi kết nối PostgreSQL: ${err.message}`, err.stack);
      throw err;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Đã ngắt kết nối cơ sở dữ liệu.');
  }
}