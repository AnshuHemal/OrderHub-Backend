import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.promotion.findMany({
      include: {
        targetProduct: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const promo = await this.prisma.promotion.findUnique({
      where: { id },
      include: {
        targetProduct: true,
      },
    });
    if (!promo) throw new NotFoundException('Promotion not found');
    return promo;
  }

  async create(dto: CreatePromotionDto) {
    return this.prisma.promotion.create({
      data: {
        name: dto.name.trim(),
        promoType: dto.promoType,
        targetProductId: dto.promoType === 'product' ? dto.targetProductId : null,
        minQuantity: dto.promoType === 'product' ? dto.minQuantity : null,
        minOrderAmount: dto.promoType === 'order' ? dto.minOrderAmount : null,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        targetProduct: true,
      },
    });
  }

  async update(id: string, dto: UpdatePromotionDto) {
    await this.findOne(id);

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.promoType !== undefined) data.promoType = dto.promoType;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.discountType !== undefined) data.discountType = dto.discountType;
    if (dto.discountValue !== undefined) data.discountValue = dto.discountValue;

    // Reset fields based on type
    const newPromoType = dto.promoType ?? undefined;
    if (newPromoType !== undefined) {
      if (newPromoType === 'product') {
        data.targetProductId = dto.targetProductId ?? null;
        data.minQuantity = dto.minQuantity ?? null;
        data.minOrderAmount = null;
      } else {
        data.targetProductId = null;
        data.minQuantity = null;
        data.minOrderAmount = dto.minOrderAmount ?? null;
      }
    } else {
      // type didn't change, just update the changed fields
      if (dto.targetProductId !== undefined) data.targetProductId = dto.targetProductId;
      if (dto.minQuantity !== undefined) data.minQuantity = dto.minQuantity;
      if (dto.minOrderAmount !== undefined) data.minOrderAmount = dto.minOrderAmount;
    }

    return this.prisma.promotion.update({
      where: { id },
      data,
      include: {
        targetProduct: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.promotion.delete({
      where: { id },
    });
  }
}
