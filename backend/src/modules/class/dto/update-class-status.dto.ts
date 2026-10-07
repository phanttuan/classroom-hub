import { IsEnum, IsNotEmpty } from 'class-validator';
import { ClassStatus } from '../../../generated/prisma/enums.js';

export class UpdateClassStatusDto {
  @IsNotEmpty({ message: 'Trạng thái lớp học không được để trống' })
  @IsEnum(ClassStatus, { message: 'Trạng thái lớp học không hợp lệ' })
  status: ClassStatus;
}
