import { IsEnum, IsNotEmpty } from 'class-validator';
import { CourseStatus } from '../../../generated/prisma/enums.js';

export class UpdateCourseStatusDto {
  @IsNotEmpty({ message: 'Trạng thái khóa học không được để trống' })
  @IsEnum(CourseStatus, { message: 'Trạng thái khóa học không hợp lệ' })
  status: CourseStatus;
}

