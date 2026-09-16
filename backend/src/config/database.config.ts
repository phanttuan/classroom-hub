import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  url?: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  database: string;
  ssl: boolean;
  synchronize: boolean;
  logging: boolean;
  pool: {
    max: number;
    min: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
  };
}

export const databaseConfig = registerAs('database', (): DatabaseConfig => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'classroom_hub',
    ssl: process.env.DB_SSL === 'true',
    // Tuyệt đối không synchronize tự động trên production để bảo vệ dữ liệu
    synchronize: isProduction ? false : process.env.DB_SYNCHRONIZE !== 'false',
    logging: process.env.DB_LOGGING === 'true',
    // Cấu hình Connection Pooling chịu tải cao
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    },
  };
});
