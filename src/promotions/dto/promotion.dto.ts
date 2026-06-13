import { IsNotEmpty, IsString, IsNumber, IsBoolean, IsOptional, IsIn, Min, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePromotionDto {
  @ApiProperty({ description: 'The title or name of the promotion' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ['product', 'order'], description: 'Promotion rule type trigger' })
  @IsString()
  @IsNotEmpty()
  @IsIn(['product', 'order'])
  promoType: 'product' | 'order';

  @ApiPropertyOptional({ description: 'MenuItem ID target for product quantity trigger' })
  @IsString()
  @IsOptional()
  targetProductId?: string;

  @ApiPropertyOptional({ description: 'Minimum quantity of target product required to trigger discount' })
  @IsInt()
  @IsOptional()
  @Min(1)
  minQuantity?: number;

  @ApiPropertyOptional({ description: 'Minimum order subtotal amount required to trigger discount' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  minOrderAmount?: number;

  @ApiProperty({ enum: ['percentage', 'fixed'], description: 'Discount type' })
  @IsString()
  @IsNotEmpty()
  @IsIn(['percentage', 'fixed'])
  discountType: 'percentage' | 'fixed';

  @ApiProperty({ description: 'Discount value (either flat cash amount or percentage fraction)' })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  discountValue: number;

  @ApiPropertyOptional({ default: true, description: 'Is the promotion active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdatePromotionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: ['product', 'order'] })
  @IsString()
  @IsOptional()
  @IsIn(['product', 'order'])
  promoType?: 'product' | 'order';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  targetProductId?: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  @Min(1)
  minQuantity?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ enum: ['percentage', 'fixed'] })
  @IsString()
  @IsOptional()
  @IsIn(['percentage', 'fixed'])
  discountType?: 'percentage' | 'fixed';

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  discountValue?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
