import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async findByCode(code: string) {
    const formattedCode = code.toUpperCase().trim();
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: formattedCode },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async create(dto: CreateCouponDto) {
    const formattedCode = dto.code.toUpperCase().trim();
    const existing = await this.prisma.coupon.findUnique({
      where: { code: formattedCode },
    });
    if (existing) {
      throw new ConflictException('A coupon with this code already exists');
    }

    return this.prisma.coupon.create({
      data: {
        code: formattedCode,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  async update(id: string, dto: UpdateCouponDto) {
    await this.findOne(id);

    if (dto.code) {
      const formattedCode = dto.code.toUpperCase().trim();
      const existing = await this.prisma.coupon.findFirst({
        where: {
          code: formattedCode,
          NOT: { id },
        },
      });
      if (existing) {
        throw new ConflictException('A coupon with this code already exists');
      }
    }

    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...(dto.code && { code: dto.code.toUpperCase().trim() }),
        ...(dto.discountType && { discountType: dto.discountType }),
        ...(dto.discountValue !== undefined && { discountValue: dto.discountValue }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.coupon.delete({
      where: { id },
    });
  }
}
