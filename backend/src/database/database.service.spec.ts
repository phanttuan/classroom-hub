import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { DatabaseService } from './database.service.js';

describe('DatabaseService', () => {
  let service: DatabaseService;
  let mockDataSource: {
    isInitialized: boolean;
    query: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockDataSource = {
      isInitialized: true,
      query: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return true and log success when query succeeds', async () => {
    mockDataSource.query.mockResolvedValueOnce([
      {
        db_name: 'classroom_hub',
        db_user: 'postgres',
        db_version: 'PostgreSQL 16.0 on x86_64',
      },
    ]);

    const result = await service.verifyConnection();
    expect(result).toBe(true);
    expect(mockDataSource.query).toHaveBeenCalledWith(
      'SELECT current_database() AS db_name, current_user AS db_user, version() AS db_version',
    );
  });

  it('should return false and log error when query fails', async () => {
    mockDataSource.query.mockRejectedValueOnce(new Error('Connection timeout'));

    const result = await service.verifyConnection();
    expect(result).toBe(false);
  });

  it('should return false if dataSource is not initialized', async () => {
    mockDataSource.isInitialized = false;

    const result = await service.verifyConnection();
    expect(result).toBe(false);
  });
});
