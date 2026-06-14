import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export enum UserRole { OWNER = 'OWNER', MANAGER = 'MANAGER', STAFF = 'STAFF', KITCHEN = 'KITCHEN' }

export class UpdateUserRoleDto {
  @ApiPropertyOptional({ enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;
}

export class UpdateUserPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;
}
