import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString, IsInt, IsEnum, IsOptional, IsNumber,
  Min, MaxLength, IsBoolean,
} from 'class-validator';

export class CreateFloorDto {
  @ApiProperty({ example: 'Ground Floor' })
  @IsString() @MaxLength(60)
  name: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional() @IsInt() @Min(0)
  position?: number;
}

export class UpdateFloorDto extends PartialType(CreateFloorDto) {}

// ── Tables ────────────────────────────────────────────────────────────────────

export enum TableShape  { SQUARE = 'SQUARE', ROUND = 'ROUND', RECTANGLE = 'RECTANGLE' }
export enum TableStatus { AVAILABLE = 'AVAILABLE', OCCUPIED = 'OCCUPIED', RESERVED = 'RESERVED', DIRTY = 'DIRTY' }

export class CreateTableDto {
  @ApiProperty() @IsString() @MaxLength(10)  number:  string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1)   seats?:  number;
  @ApiPropertyOptional({ enum: TableShape  }) @IsOptional() @IsEnum(TableShape)  shape?:  TableShape;
  @ApiPropertyOptional() @IsOptional() @IsNumber()  posX?:   number;
  @ApiPropertyOptional() @IsOptional() @IsNumber()  posY?:   number;
  @ApiPropertyOptional() @IsOptional() @IsNumber()  width?:  number;
  @ApiPropertyOptional() @IsOptional() @IsNumber()  height?: number;
  @ApiPropertyOptional() @IsOptional() @IsString()  color?:  string;
}

export class UpdateTableDto extends PartialType(CreateTableDto) {
  @ApiPropertyOptional({ enum: TableStatus })
  @IsOptional() @IsEnum(TableStatus)
  status?: TableStatus;
}
