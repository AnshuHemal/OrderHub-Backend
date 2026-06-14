import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailsService } from '../emails/emails.service';
import { EventsGateway } from '../events/events.gateway';
import { CreateIngredientDto, UpdateIngredientDto, UpdateRecipeDto } from './dto/ingredient.dto';

@Injectable()
export class IngredientsService {
  private readonly logger = new Logger(IngredientsService.name);

  constructor(
    private prisma: PrismaService,
    private emailsService: EmailsService,
    private eventsGateway: EventsGateway,
  ) {}

  // ── Ingredients CRUD ──────────────────────────────────────────────────────────

  async findAllIngredients() {
    return this.prisma.ingredient.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOneIngredient(id: string) {
    const item = await this.prisma.ingredient.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Ingredient with ID "${id}" not found`);
    return item;
  }

  async createIngredient(dto: CreateIngredientDto) {
    const existing = await this.prisma.ingredient.findUnique({
      where: { name: dto.name.trim() },
    });
    if (existing) throw new ConflictException(`Ingredient "${dto.name}" already exists`);

    const item = await this.prisma.ingredient.create({
      data: {
        name: dto.name.trim(),
        quantity: dto.quantity,
        unit: dto.unit.trim(),
        minThreshold: dto.minThreshold,
      },
    });

    this.eventsGateway.broadcast('ingredientsUpdated', { type: 'created', ingredientId: item.id });
    return item;
  }

  async updateIngredient(id: string, dto: UpdateIngredientDto) {
    await this.findOneIngredient(id);

    if (dto.name) {
      const existing = await this.prisma.ingredient.findFirst({
        where: { name: dto.name.trim(), NOT: { id } },
      });
      if (existing) throw new ConflictException(`Ingredient "${dto.name}" already exists`);
    }

    const item = await this.prisma.ingredient.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.unit && { unit: dto.unit.trim() }),
        ...(dto.minThreshold !== undefined && { minThreshold: dto.minThreshold }),
      },
    });

    this.eventsGateway.broadcast('ingredientsUpdated', { type: 'updated', ingredientId: item.id });
    return item;
  }

  async removeIngredient(id: string) {
    await this.findOneIngredient(id);
    const deleted = await this.prisma.ingredient.delete({ where: { id } });
    this.eventsGateway.broadcast('ingredientsUpdated', { type: 'deleted', ingredientId: id });
    return deleted;
  }

  // ── Recipe Linkages CRUD ──────────────────────────────────────────────────────

  async findAllRecipes() {
    return this.prisma.recipeIngredient.findMany({
      include: {
        ingredient: { select: { name: true, unit: true } },
      },
    });
  }

  async findRecipeForMenuItem(menuItemId: string) {
    return this.prisma.recipeIngredient.findMany({
      where: { menuItemId },
      include: {
        ingredient: { select: { id: true, name: true, unit: true } },
      },
    });
  }

  async updateRecipe(menuItemId: string, dto: UpdateRecipeDto) {
    const menuItem = await this.prisma.menuItem.findUnique({ where: { id: menuItemId } });
    if (!menuItem) throw new NotFoundException(`Menu item "${menuItemId}" not found`);

    return this.prisma.$transaction(async (tx) => {
      // 1. Clear old requirements
      await tx.recipeIngredient.deleteMany({ where: { menuItemId } });

      // 2. Save new configurations
      if (dto.ingredients.length > 0) {
        await tx.recipeIngredient.createMany({
          data: dto.ingredients.map(x => ({
            menuItemId,
            ingredientId: x.ingredientId,
            quantityRequired: x.quantityRequired,
          })),
        });
      }

      const refetched = await tx.recipeIngredient.findMany({
        where: { menuItemId },
        include: { ingredient: true },
      });

      this.eventsGateway.broadcast('recipesUpdated', { menuItemId });
      return refetched;
    });
  }

  // ── Checkout Deduction Engine ──────────────────────────────────────────────────

  async deductInventoryForOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                recipeIngredients: {
                  include: {
                    ingredient: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) return;

    const lowStockAlerts: Array<{ ingredientName: string; currentQty: number; threshold: number }> = [];

    // Deduct stock quantities transactionally
    await this.prisma.$transaction(async (tx) => {
      for (const orderItem of order.items) {
        const menuItem = orderItem.menuItem;
        if (!menuItem.recipeIngredients || menuItem.recipeIngredients.length === 0) continue;

        for (const recipeIng of menuItem.recipeIngredients) {
          const ingredient = recipeIng.ingredient;
          const totalDeducted = recipeIng.quantityRequired * orderItem.quantity;
          
          // Re-fetch current quantity in transaction to prevent race conditions
          const currentIng = await tx.ingredient.findUnique({ where: { id: ingredient.id } });
          if (!currentIng) continue;

          const newQuantity = Math.max(0, currentIng.quantity - totalDeducted);

          await tx.ingredient.update({
            where: { id: ingredient.id },
            data: { quantity: newQuantity },
          });

          // Check if it drops below threshold
          if (newQuantity < currentIng.minThreshold) {
            lowStockAlerts.push({
              ingredientName: currentIng.name,
              currentQty: newQuantity,
              threshold: currentIng.minThreshold,
            });
          }
        }
      }
    });

    // Handle warning alerts
    if (lowStockAlerts.length > 0) {
      this.logger.warn(`Low stock warnings triggered for: ${lowStockAlerts.map(a => a.ingredientName).join(', ')}`);

      // 1. Dispatch WebSockets warnings for cashier toasts
      for (const alert of lowStockAlerts) {
        this.eventsGateway.broadcast('lowStockWarning', alert);
      }

      // 2. Dispatch Manager notification email
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #ea580c; font-size: 20px; margin-top: 0;">⚠️ Low Stock Alert warning</h2>
            <p>The following raw ingredients in OrderHub have dropped below their minimum warning thresholds:</p>
            <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%; font-size: 13px; text-align: left; border-color: #cbd5e1;">
              <thead>
                <tr style="background-color: #f8fafc;">
                  <th>Raw Ingredient</th>
                  <th>Current Stock</th>
                  <th>Threshold Limit</th>
                </tr>
              </thead>
              <tbody>
                ${lowStockAlerts.map(a => `
                  <tr>
                    <td><strong>${a.ingredientName}</strong></td>
                    <td style="color: #dc2626; font-weight: bold;">${a.currentQty}</td>
                    <td>${a.threshold}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <p style="font-size: 12px; color: #64748b; margin-top: 20px;">Please login to the Admin panel to review restocks.</p>
          </div>
        `;
        await this.emailsService.sendEmail('admin@cafepos.com', 'Warning: Low Ingredient Stock Alert', emailHtml);
      } catch (err) {
        this.logger.error('Failed to dispatch low stock email notification:', err);
      }
    }

    // Refresh inventory screen bindings
    this.eventsGateway.broadcast('ingredientsUpdated', { type: 'deducted', orderId });
  }
}
