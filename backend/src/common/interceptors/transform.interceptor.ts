import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Hàm đệ quy chuyển đổi tất cả BigInt sang string để JSON.stringify không bị lỗi
 */
function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const newObj: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      newObj[key] = serializeBigInt(obj[key]);
    }
    return newObj;
  }
  return obj;
}

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message?: string;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const res = context.switchToHttp().getResponse();
    const statusCode = res.statusCode || 200;

    return next.handle().pipe(
      map((raw) => {
        const serialized = serializeBigInt(raw);

        // Nếu handler đã trả về cấu trúc dạng { message, data, ... }
        if (
          serialized &&
          typeof serialized === 'object' &&
          'message' in serialized &&
          'data' in serialized
        ) {
          return {
            success: true,
            statusCode,
            message: serialized.message,
            data: serialized.data,
            timestamp: new Date().toISOString(),
          };
        }

        if (
          serialized &&
          typeof serialized === 'object' &&
          'message' in serialized &&
          !('data' in serialized)
        ) {
          const { message, ...rest } = serialized;
          return {
            success: true,
            statusCode,
            message,
            data: Object.keys(rest).length > 0 ? rest : null,
            timestamp: new Date().toISOString(),
          };
        }

        return {
          success: true,
          statusCode,
          data: serialized,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
