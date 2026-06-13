import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCategoryDto, UpdateCategoryDto,
  CreateMenuItemDto, UpdateMenuItemDto,
} from './dto/menu.dto';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  // ── Categories ──────────────────────────────────────────────────────────────

  getCategories() {
    return this.prisma.category.findMany({
      where:   { isActive: true },
      orderBy: { position: 'asc' },
      include: { items: { where: { isAvailable: true }, orderBy: { position: 'asc' } } },
    });
  }

  getCategoriesAdmin() {
    return this.prisma.category.findMany({
      orderBy: { position: 'asc' },
      include: { _count: { select: { items: true } } },
    });
  }

  createCategory(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    await this.findCategoryOrThrow(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async deleteCategory(id: string) {
    await this.findCategoryOrThrow(id);
    return this.prisma.category.delete({ where: { id } });
  }

  // ── Items ───────────────────────────────────────────────────────────────────

  getAllItems() {
    return this.prisma.menuItem.findMany({
      orderBy: { position: 'asc' },
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async createItem(categoryId: string, dto: CreateMenuItemDto) {
    await this.findCategoryOrThrow(categoryId);
    return this.prisma.menuItem.create({ data: { ...dto, categoryId } });
  }

  async updateItem(id: string, dto: UpdateMenuItemDto) {
    await this.findItemOrThrow(id);
    return this.prisma.menuItem.update({ where: { id }, data: dto });
  }

  async toggleAvailability(id: string) {
    const item = await this.findItemOrThrow(id);
    return this.prisma.menuItem.update({
      where: { id },
      data:  { isAvailable: !item.isAvailable },
    });
  }

  async deleteItem(id: string) {
    await this.findItemOrThrow(id);
    return this.prisma.menuItem.delete({ where: { id } });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async findCategoryOrThrow(id: string) {
    const c = await this.prisma.category.findUnique({ where: { id } });
    if (!c) throw new NotFoundException(`Category ${id} not found`);
    return c;
  }

  private async findItemOrThrow(id: string) {
    const i = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!i) throw new NotFoundException(`MenuItem ${id} not found`);
    return i;
  }
}
