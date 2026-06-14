import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailsService } from '../emails/emails.service';
import { EventsGateway } from '../events/events.gateway';
import { IngredientsService } from '../ingredients/ingredients.service';
import {
  CreateOrderDto, AddItemsDto,
  UpdateOrderStatusDto, UpdateItemStatusDto, ProcessPaymentDto,
  VoidOrderDto, RefundOrderDto,
} from './dto/order.dto';

const TAX_RATE = 0.10; // 10% — configure per deployment

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private emailsService: EmailsService,
    private eventsGateway: EventsGateway,
    private ingredientsService: IngredientsService,
  ) {}

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
      (sum, i) => {
        const basePrice = priceMap[i.menuItemId];
        const modifiersPrice = i.selectedModifiers?.reduce((s: number, m: any) => s + (m.priceAdjustment || 0), 0) || 0;
        return sum + (basePrice + modifiersPrice) * i.quantity;
      }, 0,
    );
    const tax   = parseFloat((subtotal * TAX_RATE).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));

    // Find active session for this staff member
    const activeSession = await this.prisma.posSession.findFirst({
      where: {
        openedBy: staffId,
        status: 'OPEN',
      },
    });

    const order = await this.prisma.order.create({
      data: {
        staffId,
        posSessionId: activeSession?.id || null,
        tableId:  dto.tableId,
        customerId: dto.customerId,
        type:     dto.type    ?? 'DINE_IN',
        status:   'PENDING',
        notes:    dto.notes,
        subtotal,
        tax,
        total,
        items: {
          create: dto.items.map(i => {
            const basePrice = priceMap[i.menuItemId];
            const modifiersPrice = i.selectedModifiers?.reduce((s: number, m: any) => s + (m.priceAdjustment || 0), 0) || 0;
            return {
              menuItemId: i.menuItemId,
              quantity:   i.quantity,
              unitPrice:  basePrice + modifiersPrice,
              notes:      i.notes,
              status:     'PENDING',
              selectedModifiers: i.selectedModifiers || undefined,
            };
          }),
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
    this.eventsGateway.broadcast('ordersUpdated', { orderId: order.id, type: 'created' });
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

    const addedSubtotal = dto.items.reduce((sum, i) => {
      const basePrice = priceMap[i.menuItemId];
      const modifiersPrice = i.selectedModifiers?.reduce((s: number, m: any) => s + (m.priceAdjustment || 0), 0) || 0;
      return sum + (basePrice + modifiersPrice) * i.quantity;
    }, 0);
    const newSubtotal   = order.subtotal + addedSubtotal;
    const newTax        = parseFloat((newSubtotal * TAX_RATE).toFixed(2));
    const newTotal      = parseFloat((newSubtotal + newTax).toFixed(2));

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        subtotal: newSubtotal,
        tax:      newTax,
        total:    newTotal,
        items: {
          create: dto.items.map(i => {
            const basePrice = priceMap[i.menuItemId];
            const modifiersPrice = i.selectedModifiers?.reduce((s: number, m: any) => s + (m.priceAdjustment || 0), 0) || 0;
            return {
              menuItemId: i.menuItemId,
              quantity:   i.quantity,
              unitPrice:  basePrice + modifiersPrice,
              notes:      i.notes,
              status:     'PENDING',
              selectedModifiers: i.selectedModifiers || undefined,
            };
          }),
        },
      },
      include: this.orderInclude(),
    });
    this.eventsGateway.broadcast('ordersUpdated', { orderId, type: 'updated' });
    return updated;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    await this.findOne(id);
    const updated = await this.prisma.order.update({
      where: { id },
      data:  { status: dto.status, completedAt: dto.status === 'PAID' ? new Date() : undefined },
      include: this.orderInclude(),
    });
    this.eventsGateway.broadcast('ordersUpdated', { orderId: id, type: 'status_updated' });
    if (updated.tableId) this.eventsGateway.broadcast('tablesUpdated', { tableId: updated.tableId });
    return updated;
  }

  async updateItemStatus(itemId: string, dto: UpdateItemStatusDto) {
    const item = await this.prisma.orderItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException(`OrderItem ${itemId} not found`);
    const res = await this.prisma.orderItem.update({ where: { id: itemId }, data: { status: dto.status } });
    this.eventsGateway.broadcast('ordersUpdated', { orderId: item.orderId, itemId, type: 'item_status_updated' });
    return res;
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

    this.eventsGateway.broadcast('ordersUpdated', { orderId: id, type: 'cancelled' });
    if (order.tableId) this.eventsGateway.broadcast('tablesUpdated', { tableId: order.tableId });

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

    this.eventsGateway.broadcast('ordersUpdated', { orderId, type: 'transferred' });
    this.eventsGateway.broadcast('tablesUpdated', { tableId: newTableId });
    if (oldTableId) this.eventsGateway.broadcast('tablesUpdated', { tableId: oldTableId });

    return updated;
  }

  async linkCustomer(orderId: string, customerId: string | null) {
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data:  { customerId },
      include: this.orderInclude(),
    });
    this.eventsGateway.broadcast('ordersUpdated', { orderId, type: 'updated' });
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
    
    // Automatically deduct raw components from ingredients inventory
    await this.ingredientsService.deductInventoryForOrder(orderId).catch(err => {
      this.logger.error(`Error deducting inventory for order ${orderId}: ${err.message}`, err.stack);
    });

    this.eventsGateway.broadcast('ordersUpdated', { orderId, type: 'paid' });
    if (order.tableId) this.eventsGateway.broadcast('tablesUpdated', { tableId: order.tableId });
    return payment;
  }

  // ── Reports ────────────────────────────────────────────────────────────────────

  async getDailyReport() {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end   = new Date(); end.setHours(23, 59, 59, 999);

    const orders = await this.prisma.order.findMany({
      where: { status: 'PAID', completedAt: { gte: start, lte: end }, voidedAt: null },
      include: { items: { include: { menuItem: true } }, payment: true },
    });

    const refunds = await this.prisma.refund.findMany({
      where: { createdAt: { gte: start, lte: end } },
    });

    const totalPaidOrdersRevenue = orders.reduce((s, o) => s + o.total, 0);
    const refundsTotal = refunds.reduce((s, r) => s + r.amount, 0);
    const revenue = parseFloat((totalPaidOrdersRevenue - refundsTotal).toFixed(2));

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
      revenue,
      totalOrders,
      avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
      topItems,
      refundsTotal: parseFloat(refundsTotal.toFixed(2)),
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────────

  private orderInclude() {
    return {
      table:   { select: { id: true, number: true, floorId: true } },
      staff:   { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, email: true, phone: true } },
      items: {
        include: {
          menuItem: { select: { id: true, name: true, price: true, category: { select: { name: true } } } },
        },
      },
      payment: true,
      refunds: {
        include: {
          items: {
            include: {
              orderItem: {
                select: {
                  menuItem: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    };
  }

  // ── Voids and Refunds ──────────────────────────────────────────────────────────

  async voidOrder(orderId: string, staffId: string, dto: VoidOrderDto) {
    const order = await this.findOne(orderId);
    if (order.status !== 'PAID') {
      throw new BadRequestException('Only paid orders can be voided');
    }
    if (order.voidedAt !== null) {
      throw new BadRequestException('Order has already been voided');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Mark order as voided and cancelled
      const ord = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          voidedAt: new Date(),
          voidReason: dto.reason,
          voidedByUserId: staffId,
        },
        include: {
          table: true,
          staff: true,
          customer: true,
          items: {
            include: {
              menuItem: true,
            },
          },
          payment: true,
        },
      });

      // 2. Create the refund record for the full order amount
      await tx.refund.create({
        data: {
          orderId,
          amount: order.total,
          reason: `Void: ${dto.reason}`,
          notes: dto.notes,
          refundedByUserId: staffId,
          refundMethod: dto.refundMethod,
        },
      });

      // 3. Set table status to AVAILABLE
      if (order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: 'AVAILABLE' },
        });
      }

      return ord;
    });

    this.logger.log(`Order ${orderId} voided by user ${staffId}`);
    this.eventsGateway.broadcast('ordersUpdated', { orderId, type: 'voided' });
    if (order.tableId) {
      this.eventsGateway.broadcast('tablesUpdated', { tableId: order.tableId });
    }

    // Refresh return object with correct include
    return this.findOne(orderId);
  }

  async refundOrder(orderId: string, staffId: string, dto: RefundOrderDto) {
    const order = await this.findOne(orderId);
    if (order.status !== 'PAID') {
      throw new BadRequestException('Only paid orders can be refunded');
    }
    if (order.voidedAt !== null) {
      throw new BadRequestException('Cannot refund a voided order');
    }

    // Load active order items
    const orderItems = await this.prisma.orderItem.findMany({
      where: { orderId },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      let refundSubtotal = 0;

      // 1. Validate items and update refunded quantities
      const itemsToCreate: { orderItemId: string; quantity: number }[] = [];
      for (const itemInput of dto.items) {
        const orderItem = orderItems.find((oi) => oi.id === itemInput.orderItemId);
        if (!orderItem) {
          throw new BadRequestException(`Order item ${itemInput.orderItemId} not found on this order`);
        }

        const remainingQty = orderItem.quantity - orderItem.refundedQuantity;
        if (itemInput.quantity > remainingQty) {
          throw new BadRequestException(
            `Cannot refund ${itemInput.quantity} of "${orderItem.id}". Only ${remainingQty} remaining to refund.`,
          );
        }

        // Increment refunded quantity
        await tx.orderItem.update({
          where: { id: orderItem.id },
          data: {
            refundedQuantity: {
              increment: itemInput.quantity,
            },
          },
        });

        // Add to totals
        refundSubtotal += orderItem.unitPrice * itemInput.quantity;
        itemsToCreate.push({
          orderItemId: orderItem.id,
          quantity: itemInput.quantity,
        });
      }

      // Calculate taxes & total for this partial refund
      const refundTax = parseFloat((refundSubtotal * TAX_RATE).toFixed(2));
      let refundTotal = parseFloat((refundSubtotal + refundTax).toFixed(2));

      // Safety: Cap the refund total to ensure we do not exceed original payment total
      const existingRefunds = await tx.refund.findMany({
        where: { orderId },
      });
      const totalAlreadyRefunded = existingRefunds.reduce((sum, r) => sum + r.amount, 0);
      const remainingAllowedRefund = Math.max(0, order.total - totalAlreadyRefunded);
      if (refundTotal > remainingAllowedRefund) {
        refundTotal = remainingAllowedRefund;
      }

      // 2. Create the refund record
      const ref = await tx.refund.create({
        data: {
          orderId,
          amount: refundTotal,
          reason: dto.reason,
          notes: dto.notes,
          refundedByUserId: staffId,
          refundMethod: dto.refundMethod,
          items: {
            create: itemsToCreate,
          },
        },
      });

      // 3. Check if fully refunded
      const updatedItems = await tx.orderItem.findMany({
        where: { orderId },
      });
      const allItemsRefunded = updatedItems.every(
        (item) => item.refundedQuantity >= item.quantity,
      );

      const allRefunds = await tx.refund.findMany({
        where: { orderId },
      });
      const totalRefunded = allRefunds.reduce((sum, r) => sum + r.amount, 0);
      const isTotalRefunded = totalRefunded >= order.total;

      const isFullyRefunded = allItemsRefunded || isTotalRefunded;

      if (isFullyRefunded) {
        // Set order to CANCELLED and store refund details in void fields
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'CANCELLED',
            voidedAt: new Date(),
            voidReason: `Refunded: ${dto.reason}`,
            voidedByUserId: staffId,
          },
        });

        // Revert table status to AVAILABLE
        if (order.tableId) {
          await tx.table.update({
            where: { id: order.tableId },
            data: { status: 'AVAILABLE' },
          });
        }
      }

      return { refund: ref, isFullyRefunded };
    });

    if (result.isFullyRefunded) {
      this.logger.log(`Full refund processed for Order ${orderId} by user ${staffId}`);
      this.eventsGateway.broadcast('ordersUpdated', { orderId, type: 'refunded' });
      if (order.tableId) {
        this.eventsGateway.broadcast('tablesUpdated', { tableId: order.tableId });
      }
    } else {
      this.logger.log(`Partial refund created for Order ${orderId} by user ${staffId}`);
      this.eventsGateway.broadcast('ordersUpdated', { orderId, type: 'refunded' });
    }

    return result.refund;
  }

  async emailReceipt(orderId: string, email?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        table: true,
        staff: true,
        customer: true,
        payment: true,
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const targetEmail = email || order.customer?.email;
    if (!targetEmail) {
      throw new BadRequestException('Recipient email address is required');
    }

    const orderNum = order.table ? `Table ${order.table.number}` : `Order #${orderId.substring(0, 6).toUpperCase()}`;

    const itemsHtml = order.items.map(item => {
      const modifiers = item.selectedModifiers as any[];
      const modText = modifiers && modifiers.length > 0
        ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">
             Modifiers: ${modifiers.map((m: any) => `${m.name} (+₹${m.priceAdjustment || 0})`).join(', ')}
           </div>`
        : '';
      return `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 0; text-align: left; font-size: 14px; color: #1e293b;">
          <strong>${item.menuItem.name}</strong>
          ${modText}
          ${item.notes ? `<div style="font-size: 11px; color: #64748b;">Note: ${item.notes}</div>` : ''}
        </td>
        <td style="padding: 12px 0; text-align: center; font-size: 14px; color: #475569;">${item.quantity}</td>
        <td style="padding: 12px 0; text-align: right; font-size: 14px; color: #1e293b; font-weight: 600;">₹${(item.unitPrice * item.quantity).toFixed(2)}</td>
      </tr>
    `;
    }).join('');

    const discountRow = order.discount > 0 ? `
      <tr>
        <td colspan="2" style="padding: 6px 0; text-align: left; font-size: 14px; color: #64748b;">Discount:</td>
        <td style="padding: 6px 0; text-align: right; font-size: 14px; color: #ef4444; font-weight: 600;">-$${order.discount.toFixed(2)}</td>
      </tr>
    ` : '';

    const paymentMethod = order.payment?.method || 'CASH';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Receipt from OrderHub</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 0;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 550px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); overflow: hidden; border-collapse: collapse;">
    <tr>
      <td style="padding: 32px 32px 24px 32px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); text-align: center;">
        <div style="font-size: 32px; margin-bottom: 8px;">☕</div>
        <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">OrderHub Receipt</h1>
        <p style="color: rgba(255, 255, 255, 0.85); font-size: 13px; margin: 6px 0 0 0; font-weight: 500;">Thank you for your order!</p>
      </td>
    </tr>

    <tr>
      <td style="padding: 32px 32px 20px 32px; border-bottom: 1px dashed #e2e8f0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align: left; font-size: 13px; color: #64748b; line-height: 1.6;">
              <strong>Billed To:</strong><br>
              <span style="color: #0f172a; font-weight: 600; font-size: 14px;">${order.customer?.name || 'Valued Guest'}</span><br>
              ${targetEmail}<br>
              ${order.customer?.phone ? `${order.customer.phone}<br>` : ''}
            </td>
            <td style="text-align: right; font-size: 13px; color: #64748b; line-height: 1.6; vertical-align: top;">
              <strong>Receipt Info:</strong><br>
              Order: <span style="color: #0f172a; font-weight: 600;">${orderNum}</span><br>
              Date: ${new Date(order.createdAt).toLocaleDateString()}<br>
              Time: ${new Date(order.createdAt).toLocaleTimeString()}
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding: 24px 32px 16px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <thead>
            <tr style="border-bottom: 2px solid #e2e8f0;">
              <th style="padding-bottom: 12px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Item</th>
              <th style="padding-bottom: 12px; text-align: center; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; width: 60px;">Qty</th>
              <th style="padding-bottom: 12px; text-align: right; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; width: 80px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding: 0 32px 32px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 16px; padding: 16px;">
          <tr>
            <td colspan="2" style="padding: 6px 0; text-align: left; font-size: 14px; color: #64748b;">Subtotal:</td>
            <td style="padding: 6px 0; text-align: right; font-size: 14px; color: #1e293b; font-weight: 500;">$${order.subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 6px 0; text-align: left; font-size: 14px; color: #64748b;">Taxes & Vat:</td>
            <td style="padding: 6px 0; text-align: right; font-size: 14px; color: #1e293b; font-weight: 500;">$${order.tax.toFixed(2)}</td>
          </tr>
          ${discountRow}
          <tr style="border-top: 1px solid #e2e8f0;">
            <td colspan="2" style="padding: 12px 0 0 0; text-align: left; font-size: 16px; font-weight: 800; color: #0f172a;">GRAND TOTAL:</td>
            <td style="padding: 12px 0 0 0; text-align: right; font-size: 18px; font-weight: 800; color: #d97706;">$${order.total.toFixed(2)}</td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding: 24px 32px 32px 32px; background-color: #f1f5f9; text-align: center; border-radius: 0 0 24px 24px;">
        <p style="font-size: 13px; color: #475569; margin: 0 0 8px 0; font-weight: 500;">
          Paid via <strong>${paymentMethod}</strong> ${order.payment?.reference ? `(Ref: ${order.payment.reference})` : ''}
        </p>
        <div style="font-size: 12px; color: #94a3b8; font-weight: 500;">
          If you have any questions about this receipt, please contact us at info@orderhub.com
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    return this.emailsService.sendEmail(targetEmail, `Receipt for ${orderNum} - OrderHub`, htmlContent);
  }
}
