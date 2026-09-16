import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Database');

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    await this.verifyConnection();
  }

  /**
   * Kiểm tra kết nối tới cơ sở dữ liệu PostgreSQL và in log ngắn gọn ra console
   */
  async verifyConnection(): Promise<boolean> {
    try {
      if (!this.dataSource.isInitialized) {
        return false;
      }

      const result = await this.dataSource.query(
        'SELECT current_database() AS db_name, current_user AS db_user, version() AS db_version',
      );

      const dbName = result[0]?.db_name || 'N/A';
      const dbUser = result[0]?.db_user || 'N/A';
      const rawVersion = result[0]?.db_version || '';
      const shortVersion =
        rawVersion.split(' ')?.[0] + ' ' + (rawVersion.split(' ')?.[1] || '');

      this.logger.log(
        `✅ Kết nối PostgreSQL thành công! [DB: ${dbName} | User: ${dbUser} | ${shortVersion}]`,
      );
      return true;
    } catch (error: any) {
      this.logger.error(`❌ Kết nối PostgreSQL thất bại: ${error.message}`);
      return false;
    }
  }

  getDataSource(): DataSource {
    return this.dataSource;
  }
}
