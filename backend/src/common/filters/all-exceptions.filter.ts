import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

function safeStringify(value: unknown): string {
  try {
    const s = JSON.stringify(value);
    return typeof s === 'string' ? s : String(value);
  } catch {
    return String(value);
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.';
    let errors: Record<string, string> | string[] | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        message = resObj.message || exception.message;

        // Nếu là lỗi validation từ ValidationPipe (mảng string hoặc object)
        if (Array.isArray(resObj.message)) {
          message = 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.';
          const fieldErrors: Record<string, string> = {};

          for (const msg of resObj.message) {
            if (typeof msg === 'string') {
              // Parse các message dạng "email must be an email" hoặc tương tự
              const firstWord = msg.split(' ')[0];
              if (!fieldErrors[firstWord]) {
                fieldErrors[firstWord] = msg;
              }
            }
          }
          errors = Object.keys(fieldErrors).length > 0 ? fieldErrors : resObj.message;
        } else if (resObj.errors) {
          errors = resObj.errors;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
    } else {
      // SDK bên thứ ba (vd. Cloudinary) đôi khi reject object thường thay vì Error
      this.logger.error(
        `Unhandled non-Error exception: ${request.method} ${request.url} -> ${status}: ${safeStringify(exception)}`,
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
