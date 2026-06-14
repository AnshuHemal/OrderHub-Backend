import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString, IsEnum, IsOptional, IsArray,
  IsInt, IsNumber, Min, ValidateNested, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum OrderType   { DINE_IN = 'DINE_IN', TAKEAWAY = 'TAKEAWAY', DELIVERY = 'DELIVERY' }
export enum OrderStatus {
  PENDING = 'PENDING', CONFIRMED = 'CONFIRMED', PREPARING = 'PREPARING',
  READY = 'READY', SERVED = 'SERVED', PAID = 'PAID', CANCELLED = 'CANCELLED',
}
export enum ItemStatus  { PENDING = 'PENDING', PREPARING = 'PREPARING', READY = 'READY', SERVED = 'SERVED' }
export enum PaymentMethod { CASH = 'CASH', CARD = 'CARD', UPI = 'UPI', WALLET = 'WALLET' }

export class OrderItemDto {
  @ApiProperty()  @IsString()  menuItemId: string;
  @ApiProperty()  @IsInt() @Min(1) quantity: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() selectedModifiers?: any[];
}

export class CreateOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() tableId?: string;
  @ApiPropertyOptional({ enum: OrderType }) @IsOptional() @IsEnum(OrderType) type?: OrderType;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) notes?: string;
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

export class AddItemsDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus }) @IsEnum(OrderStatus) status: OrderStatus;
}

export class UpdateItemStatusDto {
  @ApiProperty({ enum: ItemStatus }) @IsEnum(ItemStatus) status: ItemStatus;
}

export class ProcessPaymentDto {
  @ApiProperty({ enum: PaymentMethod }) @IsEnum(PaymentMethod) method: PaymentMethod;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) tip?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
}

export class VoidOrderDto {
  @ApiProperty({ example: "Wrong Item" })
  @IsString()
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: "CASH" })
  @IsString()
  refundMethod: string;
}

export class RefundItemInputDto {
  @ApiProperty()
  @IsString()
  orderItemId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity: number;
}

export class RefundOrderDto {
  @ApiProperty({ example: "Wrong Item" })
  @IsString()
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: "CASH" })
  @IsString()
  refundMethod: string;

  @ApiProperty({ type: [RefundItemInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RefundItemInputDto)
  items: RefundItemInputDto[];
}
