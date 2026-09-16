import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

/**
 * BaseEntity dùng chung cho mọi entity trong hệ thống.
 * Cung cấp:
 * - ID dạng UUID v4 tự động sinh
 * - createdAt: thời gian tạo (tự động)
 * - updatedAt: thời gian cập nhật gần nhất (tự động)
 * - deletedAt: thời gian xóa mềm (soft delete, không mất dữ liệu vật lý)
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date;
}
