import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class OpenSessionDto {
  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(0)
  openingBalance: number;
}

export class CloseSessionDto {
  @ApiProperty({ example: 1250 })
  @IsNumber()
  @Min(0)
  countedCash: number;
}
