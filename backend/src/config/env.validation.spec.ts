import { describe, it, expect } from 'vitest';
import { validateEnvironment } from './env.validation.js';

describe('Environment Validation', () => {
  it('should pass with default/valid configuration', () => {
    const config = {
      NODE_ENV: 'development',
      PORT: '5000',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_USERNAME: 'postgres',
      DB_DATABASE: 'classroom_hub',
      DB_SSL: 'false',
    };

    const result = validateEnvironment(config);
    expect(result.PORT).toBe(5000);
    expect(result.DB_PORT).toBe(5432);
    expect(result.DB_SSL).toBe(false);
    expect(result.NODE_ENV).toBe('development');
  });

  it('should throw an error if PORT is out of valid range', () => {
    const invalidConfig = {
      PORT: '999999', // Port lớn hơn 65535
    };

    expect(() => validateEnvironment(invalidConfig)).toThrow(
      /LỖI CẤU HÌNH BIẾN MÔI TRƯỜNG/,
    );
  });

  it('should throw an error if NODE_ENV is invalid', () => {
    const invalidConfig = {
      NODE_ENV: 'invalid_env_name',
    };

    expect(() => validateEnvironment(invalidConfig)).toThrow(
      /LỖI CẤU HÌNH BIẾN MÔI TRƯỜNG/,
    );
  });
});
