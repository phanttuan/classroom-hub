import { IsBoolean, IsOptional } from 'class-validator';

export class ToggleProgressDto {
  @IsBoolean({ message: 'isCompleted phải là boolean' })
  @IsOptional()
  isCompleted?: boolean;
}
