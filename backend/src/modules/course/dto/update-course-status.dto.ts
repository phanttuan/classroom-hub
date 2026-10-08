import { IsEnum, IsNotEmpty } from 'class-validator';
import { CourseStatus } from '../../../generated/prisma/enums.js';

export class UpdateCourseStatusDto {
  @IsNotEmpty({ message: 'Trạng thái lớp học không được để trống' })
  @IsEnum(CourseStatus, { message: 'Trạng thái lớp học không hợp lệ' })
  status: CourseStatus;
}

