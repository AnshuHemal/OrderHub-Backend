import {
  Controller, Get, Post, Put, Patch, Delete,
  Param, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MenuService } from './menu.service';
import {
  CreateCategoryDto, UpdateCategoryDto,
  CreateMenuItemDto, UpdateMenuItemDto,
} from './dto/menu.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Menu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('menu')
export class MenuController {
  constructor(private svc: MenuService) {}

  // ── Categories (public read, manager write) ──────────────────────────────────

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Get active categories with items (POS view)' })
  getCategories() { return this.svc.getCategories(); }

  @Get('categories/admin')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Get all categories including inactive (admin)' })
  getCategoriesAdmin() { return this.svc.getCategoriesAdmin(); }

  @Post('categories')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Create category' })
  createCategory(@Body() dto: CreateCategoryDto) { return this.svc.createCategory(dto); }

  @Put('categories/:id')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Update category' })
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.svc.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCategory(@Param('id') id: string) { return this.svc.deleteCategory(id); }

  // ── Items ─────────────────────────────────────────────────────────────────────

  @Get('items')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Get all menu items (admin)' })
  getAllItems() { return this.svc.getAllItems(); }

  @Post('categories/:categoryId/items')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Create menu item in a category' })
  createItem(@Param('categoryId') catId: string, @Body() dto: CreateMenuItemDto) {
    return this.svc.createItem(catId, dto);
  }

  @Put('items/:id')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Update menu item' })
  updateItem(@Param('id') id: string, @Body() dto: UpdateMenuItemDto) {
    return this.svc.updateItem(id, dto);
  }

  @Patch('items/:id/availability')
  @ApiOperation({ summary: 'Toggle item availability (86 an item)' })
  toggleAvailability(@Param('id') id: string) { return this.svc.toggleAvailability(id); }

  @Delete('items/:id')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteItem(@Param('id') id: string) { return this.svc.deleteItem(id); }
}
