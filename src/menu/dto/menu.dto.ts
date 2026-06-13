import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString, IsNumber, IsBoolean, IsOptional,
  Min, MaxLength, IsInt,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Hot Drinks' })
  @IsString() @MaxLength(60)
  name: string;

  @ApiPropertyOptional() @IsOptional() @IsString() icon?:  string;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0)   position?: number;
}
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateMenuItemDto {
  @ApiProperty({ example: 'Cappuccino' })
  @IsString() @MaxLength(80)
  name: string;

  @ApiProperty({ example: 3.50 })
  @IsNumber() @Min(0)
  price: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()  image?:       string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isAvailable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPopular?:   boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0)           position?:  number;
}
export class UpdateMenuItemDto extends PartialType(CreateMenuItemDto) {}
