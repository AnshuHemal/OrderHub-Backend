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

  @ApiPropertyOptional({ example: 'Barista Station' })
  @IsOptional() @IsString() @MaxLength(100)
  preparationStation?: string;
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

export class CreateModifierGroupDto {
  @ApiProperty({ example: 'Size' })
  @IsString() @MaxLength(80)
  name: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional() @IsInt() @Min(0)
  minSelection?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @IsInt() @Min(1)
  maxSelection?: number;
}

export class UpdateModifierGroupDto extends PartialType(CreateModifierGroupDto) {}

export class CreateModifierOptionDto {
  @ApiProperty({ example: 'Large' })
  @IsString() @MaxLength(80)
  name: string;

  @ApiProperty({ example: 30 })
  @IsNumber()
  priceAdjustment: number;
}

export class UpdateModifierOptionDto extends PartialType(CreateModifierOptionDto) {}
