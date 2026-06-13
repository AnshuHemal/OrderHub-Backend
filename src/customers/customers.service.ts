import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async create(dto: CreateCustomerDto) {
    const existing = await this.prisma.customer.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existing) throw new ConflictException('A customer with this email already exists');

    return this.prisma.customer.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone?.trim() || null,
      },
    });
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);

    if (dto.email) {
      const existing = await this.prisma.customer.findFirst({
        where: {
          email: dto.email.toLowerCase().trim(),
          NOT: { id },
        },
      });
      if (existing) throw new ConflictException('A customer with this email already exists');
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.email && { email: dto.email.toLowerCase().trim() }),
        phone: dto.phone !== undefined ? (dto.phone?.trim() || null) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.customer.delete({
      where: { id },
    });
  }
}
