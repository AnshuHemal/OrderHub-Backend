import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserRoleDto, UpdateUserPasswordDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true, name: true, email: true,
        role: true, image: true, emailVerified: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true,
        role: true, image: true, emailVerified: true, createdAt: true,
      },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async updatePassword(actorId: string, targetId: string, dto: UpdateUserPasswordDto) {
    const targetUser = await this.findOne(targetId);
    const hash = await bcrypt.hash(dto.password, 12);

    const account = await this.prisma.account.findFirst({
      where: {
        userId: targetId,
        providerId: 'credential',
      },
    });

    if (account) {
      await this.prisma.account.update({
        where: { id: account.id },
        data: { password: hash },
      });
    } else {
      await this.prisma.account.create({
        data: {
          userId: targetId,
          providerId: 'credential',
          accountId: targetUser.email.toLowerCase(),
          password: hash,
        },
      });
    }

    return { success: true };
  }

  async updateRole(actorId: string, targetId: string, dto: UpdateUserRoleDto) {
    if (actorId === targetId) {
      throw new ForbiddenException('You cannot change your own role');
    }
    await this.findOne(targetId);
    return this.prisma.user.update({
      where: { id: targetId },
      data:  { role: dto.role },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  async remove(actorId: string, targetId: string) {
    if (actorId === targetId) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    await this.findOne(targetId);
    return this.prisma.user.delete({ where: { id: targetId } });
  }

  // Workload summary — open orders per staff
  async getWorkload() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true, name: true, role: true, image: true,
        orders: {
          where:  { status: { notIn: ['PAID', 'CANCELLED'] } },
          select: { id: true, status: true, createdAt: true },
        },
      },
    });
    return users.map(u => ({
      ...u,
      openOrders: u.orders.length,
    }));
  }
}
