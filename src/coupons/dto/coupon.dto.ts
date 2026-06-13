import { IsNotEmpty, IsString, IsNumber, IsBoolean, IsOptional, IsIn, Min } from 'class-validator';

export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['percentage', 'fixed'])
  discountType: 'percentage' | 'fixed';

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  discountValue: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateCouponDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  @IsIn(['percentage', 'fixed'])
  discountType?: 'percentage' | 'fixed';

  @IsNumber()
  @IsOptional()
  @Min(0)
  discountValue?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
