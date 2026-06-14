import { IsNotEmpty, IsString, IsInt, Min, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ example: 'clw1234567890abcdef' })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ example: 'clw0987654321fedcba' })
  @IsString()
  @IsNotEmpty()
  tableId: string;

  @ApiProperty({ example: '2026-06-14T19:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  bookingTime: string;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  guestsCount: number;

  @ApiPropertyOptional({ example: 'Prefers quiet booth near window.' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateBookingStatusDto {
  @ApiProperty({ example: 'confirmed', enum: ['pending', 'confirmed', 'cancelled'] })
  @IsEnum(['pending', 'confirmed', 'cancelled'])
  @IsNotEmpty()
  status: string;
}
