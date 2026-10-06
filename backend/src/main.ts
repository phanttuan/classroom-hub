import { NestFactory } from '@nestjs/core';
import {
  ConsoleLogger,
  Logger,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

/**
 * Logger tùy chỉnh: loại bỏ các log khởi tạo rườm rà của NestJS (InstanceLoader, RoutesResolver, RouterExplorer)
 */
class AppLogger extends ConsoleLogger {
  override log(message: any, context?: string) {
    if (
      context === 'InstanceLoader' ||
      context === 'RoutesResolver' ||
      context === 'RouterExplorer'
    ) {
      return;
    }
    super.log(message, context);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new AppLogger(),
  });
  const logger = new Logger('App');
  const configService = app.get(ConfigService);

  const port = configService.get<number>('app.port', 5000);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api/v1');
  const corsOrigins = configService.get<string[]>('app.corsOrigins', [
    'http://localhost:3000',
  ]);
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');

  // 1. Kích hoạt Graceful Shutdown
  app.enableShutdownHooks();

  // 2. Middleware phân tích Cookie (đọc HttpOnly token)
  app.use(cookieParser());

  // 3. Cấu hình CORS (cho phép gửi kèm credentials/cookie)
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // 3. Thiết lập tiền tố API toàn cục
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['/'],
  });

  // 4. Global Validation Pipe với format lỗi chuẩn theo từng trường input
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (validationErrors = []) => {
        const errors: Record<string, string> = {};
        for (const err of validationErrors) {
          if (err.constraints) {
            errors[err.property] = Object.values(err.constraints)[0];
          }
        }
        return new BadRequestException({
          message: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
          errors,
        });
      },
    }),
  );

  // 5. Khởi động ứng dụng
  await app.listen(port);

  logger.log(
    `🚀 Ứng dụng sẵn sàng: http://localhost:${port}/${apiPrefix} [${nodeEnv}]`,
  );
}

await bootstrap();
