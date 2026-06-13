import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateOrderDto, AddItemsDto,
  UpdateOrderStatusDto, UpdateItemStatusDto, ProcessPaymentDto,
} from './dto/order.dto';

const TAX_RATE = 0.10; // 10% — configure per deployment

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private prisma: PrismaService) {}

  // ── Create order ─────────────────────────────────────────────────────────────

  async createOrder(staffId: string, dto: CreateOrderDto) {
    // Resolve menu items & prices
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: dto.items.map(i => i.menuItemId) }, isAvailable: true },
    });

    if (menuItems.length !== dto.items.length) {
      const found = new Set(menuItems.map(m => m.id));
      const missing = dto.items.filter(i => !found.has(i.menuItemId)).map(i => i.menuItemId);
      throw new BadRequestException(`Items not found or unavailable: ${missing.join(', ')}`);
    }

    const priceMap = Object.fromEntries(menuItems.map(m => [m.id, m.price]));

    const subtotal = dto.items.reduce(
      (sum, i) => sum + priceMap[i.menuItemId] * i.quantity, 0,
    );
    const tax   = parseFloat((subtotal * TAX_RATE).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));

    const order = await this.prisma.order.create({
      data: {
        staffId,
        tableId:  dto.tableId,
        type:     dto.type    ?? 'DINE_IN',
        status:   'PENDING',
        notes:    dto.notes,
        subtotal,
        tax,
        total,
        items: {
          create: dto.items.map(i => ({
            menuItemId: i.menuItemId,
            quantity:   i.quantity,
            unitPrice:  priceMap[i.menuItemId],
            notes:      i.notes,
            status:     'PENDING',
          })),
        },
      },
      include: this.orderInclude(),
    });

    // Mark table occupied
    if (dto.tableId) {
      await this.prisma.table.update({
        where: { id: dto.tableId },
        data:  { status: 'OCCUPIED' },
      }).catch(() => {});
    }

    this.logger.log(`Order created: ${order.id}`);
    return order;
  }

  // ── Get orders ────────────────────────────────────────────────────────────────

  findAll(status?: string) {
    return this.prisma.order.findMany({
      where:   status ? { status: status as never } : {},
      orderBy: { createdAt: 'desc' },
      include: this.orderInclude(),
    });
  }

  findKitchenQueue() {
    return this.prisma.orderItem.findMany({
      where:   { status: { in: ['PENDING', 'PREPARING'] } },
      orderBy: { createdAt: 'asc' },
      include: {
        menuItem: { select: { id: true, name: true, category: { select: { name: true } } } },
        order:    { select: { id: true, type: true, table: { select: { number: true } } } },
      },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: this.orderInclude(),
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  // ── Modify order ──────────────────────────────────────────────────────────────

  async addItems(orderId: string, dto: AddItemsDto) {
    const order = await this.findOne(orderId);
    if (['PAID', 'CANCELLED'].includes(order.status)) {
      throw new BadRequestException('Cannot modify a paid or cancelled order');
    }

    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: dto.items.map(i => i.menuItemId) } },
    });
    const priceMap = Object.fromEntries(menuItems.map(m => [m.id, m.price]));

    const addedSubtotal = dto.items.reduce((s, i) => s + priceMap[i.menuItemId] * i.quantity, 0);
    const newSubtotal   = order.subtotal + addedSubtotal;
    const newTax        = parseFloat((newSubtotal * TAX_RATE).toFixed(2));
    const newTotal      = parseFloat((newSubtotal + newTax).toFixed(2));

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        subtotal: newSubtotal,
        tax:      newTax,
        total:    newTotal,
        items: {
          create: dto.items.map(i => ({
            menuItemId: i.menuItemId,
            quantity:   i.quantity,
            unitPrice:  priceMap[i.menuItemId],
            notes:      i.notes,
            status:     'PENDING',
          })),
        },
      },
      include: this.orderInclude(),
    });
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    await this.findOne(id);
    return this.prisma.order.update({
      where: { id },
      data:  { status: dto.status, completedAt: dto.status === 'PAID' ? new Date() : undefined },
      include: this.orderInclude(),
    });
  }

  async updateItemStatus(itemId: string, dto: UpdateItemStatusDto) {
    const item = await this.prisma.orderItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException(`OrderItem ${itemId} not found`);
    return this.prisma.orderItem.update({ where: { id: itemId }, data: { status: dto.status } });
  }

  async cancelOrder(id: string) {
    const order = await this.findOne(id);
    if (order.status === 'PAID') throw new BadRequestException('Cannot cancel a paid order');

    const updated = await this.prisma.order.update({
      where: { id },
      data:  { status: 'CANCELLED' },
      include: this.orderInclude(),
    });

    // Free table if dine-in
    if (order.tableId) {
      await this.prisma.table.update({
        where: { id: order.tableId },
        data:  { status: 'AVAILABLE' },
      }).catch(() => {});
    }

    return updated;
  }

  // ── Transfer table ─────────────────────────────────────────────────────────────

  async transferTable(orderId: string, newTableId: string) {
    const order = await this.findOne(orderId);
    const oldTableId = order.tableId;

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data:  { tableId: newTableId },
      include: this.orderInclude(),
    });

    // Free old table, occupy new
    if (oldTableId) {
      await this.prisma.table.update({ where: { id: oldTableId }, data: { status: 'AVAILABLE' } }).catch(() => {});
    }
    await this.prisma.table.update({ where: { id: newTableId }, data: { status: 'OCCUPIED' } }).catch(() => {});

    return updated;
  }

  // ── Payment ────────────────────────────────────────────────────────────────────

  async processPayment(orderId: string, dto: ProcessPaymentDto) {
    const order = await this.findOne(orderId);
    if (order.status === 'PAID') throw new BadRequestException('Order already paid');

    const tip      = dto.tip      ?? 0;
    const discount = dto.discount ?? 0;
    const total    = parseFloat((order.subtotal + order.tax + tip - discount).toFixed(2));

    const [payment] = await this.prisma.$transaction([
      this.prisma.payment.create({
        data: { orderId, method: dto.method, amount: total, reference: dto.reference },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data:  { status: 'PAID', tip, discount, total, completedAt: new Date() },
      }),
    ]);

    // Free table
    if (order.tableId) {
      await this.prisma.table.update({
        where: { id: order.tableId },
        data:  { status: 'DIRTY' },   // needs cleaning after payment
      }).catch(() => {});
    }

    this.logger.log(`Order ${orderId} paid — ${dto.method} ${total}`);
    return payment;
  }

  // ── Reports ────────────────────────────────────────────────────────────────────

  async getDailyReport() {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end   = new Date(); end.setHours(23, 59, 59, 999);

    const orders = await this.prisma.order.findMany({
      where: { status: 'PAID', completedAt: { gte: start, lte: end } },
      include: { items: { include: { menuItem: true } }, payment: true },
    });

    const revenue      = orders.reduce((s, o) => s + o.total, 0);
    const totalOrders  = orders.length;
    const avgOrderValue = totalOrders > 0 ? revenue / totalOrders : 0;

    // Top items
    const itemMap = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const order of orders) {
      for (const item of order.items) {
        const key  = item.menuItemId;
        const prev = itemMap.get(key) ?? { name: item.menuItem.name, qty: 0, revenue: 0 };
        itemMap.set(key, {
          name:    prev.name,
          qty:     prev.qty + item.quantity,
          revenue: prev.revenue + item.unitPrice * item.quantity,
        });
      }
    }
    const topItems = [...itemMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 10);

    return {
      date:      start.toISOString().split('T')[0],
      revenue:   parseFloat(revenue.toFixed(2)),
      totalOrders,
      avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
      topItems,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────────

  private orderInclude() {
    return {
      table:   { select: { id: true, number: true, floorId: true } },
      staff:   { select: { id: true, name: true } },
      items: {
        include: {
          menuItem: { select: { id: true, name: true, price: true, category: { select: { name: true } } } },
        },
      },
      payment: true,
    };
  }
}
