import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'fullName مطلوب' })
  fullName: string;

  @IsString()
  @IsNotEmpty({ message: 'username مطلوب' })
  @MaxLength(50)
  username: string;

  @IsEnum(Role, { message: 'الدور غير صالح' })
  role: Role;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'كلمة المرور المؤقتة يجب ألا تقل عن 8 أحرف' })
  @MaxLength(128)
  tempPassword?: string;
}
