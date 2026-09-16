import 'reflect-metadata';
import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsInt()
  @Min(1)
  @Max(65535)
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  PORT: number = 5000;

  @IsString()
  @IsOptional()
  API_PREFIX: string = 'api/v1';

  @IsString()
  @IsOptional()
  CORS_ORIGINS: string = 'http://localhost:3000';

  // --- Cấu hình Database PostgreSQL ---

  @IsString()
  @IsOptional()
  DATABASE_URL?: string;

  @IsString()
  @IsOptional()
  DB_HOST: string = 'localhost';

  @IsInt()
  @Min(1)
  @Max(65535)
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  DB_PORT: number = 5432;

  @IsString()
  @IsOptional()
  DB_USERNAME: string = 'postgres';

  @IsString()
  @IsOptional()
  DB_PASSWORD: string = '';

  @IsString()
  @IsOptional()
  DB_DATABASE: string = 'classroom_hub';

  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true' || value === true || value === '1' || value === 1)
      return true;
    if (value === 'false' || value === false || value === '0' || value === 0)
      return false;
    return value;
  })
  @IsOptional()
  DB_SSL: boolean = false;

  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true' || value === true || value === '1' || value === 1)
      return true;
    if (value === 'false' || value === false || value === '0' || value === 0)
      return false;
    return value;
  })
  @IsOptional()
  DB_SYNCHRONIZE: boolean = true;

  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true' || value === true || value === '1' || value === 1)
      return true;
    if (value === 'false' || value === false || value === '0' || value === 0)
      return false;
    return value;
  })
  @IsOptional()
  DB_LOGGING: boolean = false;

  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  DB_POOL_MAX: number = 20;

  @IsInt()
  @Min(0)
  @Max(50)
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  DB_POOL_MIN: number = 2;
}

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config);

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const formattedErrors = errors
      .map((error) => {
        const constraints = error.constraints
          ? Object.values(error.constraints).join(', ')
          : 'Giá trị không hợp lệ';
        return `  ❌ [${error.property}]: ${constraints} (Giá trị hiện tại: "${error.value}")`;
      })
      .join('\n');

    throw new Error(
      `\n============================================================\n` +
        `🚨 LỖI CẤU HÌNH BIẾN MÔI TRƯỜNG (.env):\n` +
        `${formattedErrors}\n` +
        `💡 Vui lòng kiểm tra lại file .env của bạn.\n` +
        `============================================================\n`,
    );
  }

  return validatedConfig;
}
