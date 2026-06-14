import {
  Controller, Get, Post, Put, Patch, Delete,
  Param, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MenuService } from './menu.service';
import {
  CreateCategoryDto, UpdateCategoryDto,
  CreateMenuItemDto, UpdateMenuItemDto,
  CreateModifierGroupDto, UpdateModifierGroupDto,
  CreateModifierOptionDto, UpdateModifierOptionDto,
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

  // ── Modifiers (manager write) ──────────────────────────────────────────────

  @Post('items/:menuItemId/modifier-groups')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Create a modifier group for a menu item' })
  createModifierGroup(
    @Param('menuItemId') menuItemId: string,
    @Body() dto: CreateModifierGroupDto,
  ) {
    return this.svc.createModifierGroup(menuItemId, dto);
  }

  @Put('modifier-groups/:id')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Update a modifier group' })
  updateModifierGroup(
    @Param('id') id: string,
    @Body() dto: UpdateModifierGroupDto,
  ) {
    return this.svc.updateModifierGroup(id, dto);
  }

  @Delete('modifier-groups/:id')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a modifier group' })
  deleteModifierGroup(@Param('id') id: string) {
    return this.svc.deleteModifierGroup(id);
  }

  @Post('modifier-groups/:groupId/options')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Create a modifier option for a group' })
  createModifierOption(
    @Param('groupId') groupId: string,
    @Body() dto: CreateModifierOptionDto,
  ) {
    return this.svc.createModifierOption(groupId, dto);
  }

  @Put('modifier-options/:id')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Update a modifier option' })
  updateModifierOption(
    @Param('id') id: string,
    @Body() dto: UpdateModifierOptionDto,
  ) {
    return this.svc.updateModifierOption(id, dto);
  }

  @Delete('modifier-options/:id')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a modifier option' })
  deleteModifierOption(@Param('id') id: string) {
    return this.svc.deleteModifierOption(id);
  }
}
