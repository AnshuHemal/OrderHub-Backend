import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum UserRole { OWNER = 'OWNER', MANAGER = 'MANAGER', STAFF = 'STAFF', KITCHEN = 'KITCHEN' }

export class UpdateUserRoleDto {
  @ApiPropertyOptional({ enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;
}
