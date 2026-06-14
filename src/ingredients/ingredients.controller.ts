import {
  Controller, Get, Post, Put, Delete,
  Param, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IngredientsService } from './ingredients.service';
import { CreateIngredientDto, UpdateIngredientDto, UpdateRecipeDto } from './dto/ingredient.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Ingredients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class IngredientsController {
  constructor(private svc: IngredientsService) {}

  // ── Ingredients API ──────────────────────────────────────────────────────────

  @Get('ingredients')
  @ApiOperation({ summary: 'List all raw ingredients' })
  findAllIngredients() {
    return this.svc.findAllIngredients();
  }

  @Get('ingredients/:id')
  @ApiOperation({ summary: 'Get ingredient details by ID' })
  findOneIngredient(@Param('id') id: string) {
    return this.svc.findOneIngredient(id);
  }

  @Post('ingredients')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new raw ingredient' })
  createIngredient(@Body() dto: CreateIngredientDto) {
    return this.svc.createIngredient(dto);
  }

  @Put('ingredients/:id')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Update raw ingredient details' })
  updateIngredient(@Param('id') id: string, @Body() dto: UpdateIngredientDto) {
    return this.svc.updateIngredient(id, dto);
  }

  @Delete('ingredients/:id')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a raw ingredient' })
  removeIngredient(@Param('id') id: string) {
    return this.svc.removeIngredient(id);
  }

  // ── Recipes API ──────────────────────────────────────────────────────────────

  @Get('recipes')
  @ApiOperation({ summary: 'List all recipe items mapping requirements' })
  findAllRecipes() {
    return this.svc.findAllRecipes();
  }

  @Get('recipes/:menuItemId')
  @ApiOperation({ summary: 'Get recipe configuration for a menu item' })
  findRecipeForMenuItem(@Param('menuItemId') menuItemId: string) {
    return this.svc.findRecipeForMenuItem(menuItemId);
  }

  @Put('recipes/:menuItemId')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Configure or update menu item recipes ingredients mapping' })
  updateRecipe(@Param('menuItemId') menuItemId: string, @Body() dto: UpdateRecipeDto) {
    return this.svc.updateRecipe(menuItemId, dto);
  }
}
