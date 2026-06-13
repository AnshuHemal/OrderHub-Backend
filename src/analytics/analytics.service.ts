import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // ── Revenue by date range ──────────────────────────────────────────────────

  async getRevenueSummary(days = 7) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);

    const orders = await this.prisma.order.findMany({
      where:   { status: 'PAID', completedAt: { gte: from } },
      select:  { total: true, completedAt: true, type: true },
      orderBy: { completedAt: 'asc' },
    });

    // Group by day
    const byDay = new Map<string, number>();
    for (const o of orders) {
      const day = o.completedAt!.toISOString().split('T')[0];
      byDay.set(day, (byDay.get(day) ?? 0) + o.total);
    }

    const chartData = [...byDay.entries()].map(([date, revenue]) => ({
      date,
      revenue: parseFloat(revenue.toFixed(2)),
    }));

    const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
    const dineIn   = orders.filter(o => o.type === 'DINE_IN').length;
    const takeaway = orders.filter(o => o.type === 'TAKEAWAY').length;
    const delivery = orders.filter(o => o.type === 'DELIVERY').length;

    return {
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalOrders:  orders.length,
      avgOrderValue: orders.length
        ? parseFloat((totalRevenue / orders.length).toFixed(2))
        : 0,
      byOrderType: { dineIn, takeaway, delivery },
      chartData,
    };
  }

  // ── Top selling items ──────────────────────────────────────────────────────

  async getTopItems(limit = 10) {
    const result = await this.prisma.orderItem.groupBy({
      by:      ['menuItemId'],
      _sum:    { quantity: true },
      _count:  { id: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take:    limit,
    });

    const ids   = result.map(r => r.menuItemId);
    const items = await this.prisma.menuItem.findMany({
      where:   { id: { in: ids } },
      select:  { id: true, name: true, price: true, category: { select: { name: true } } },
    });

    const itemMap = Object.fromEntries(items.map(i => [i.id, i]));

    return result.map(r => ({
      item:     itemMap[r.menuItemId],
      quantity: r._sum.quantity ?? 0,
      orders:   r._count.id,
    }));
  }

  // ── Hourly distribution ────────────────────────────────────────────────────

  async getHourlyDistribution() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const orders = await this.prisma.order.findMany({
      where:  { status: 'PAID', completedAt: { gte: today } },
      select: { total: true, completedAt: true },
    });

    const hours = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: `${h.toString().padStart(2, '0')}:00`,
      orders: 0,
      revenue: 0,
    }));

    for (const o of orders) {
      const h = o.completedAt!.getHours();
      hours[h].orders++;
      hours[h].revenue += o.total;
    }

    return hours.map(h => ({ ...h, revenue: parseFloat(h.revenue.toFixed(2)) }));
  }

  // ── Table utilisation ──────────────────────────────────────────────────────

  async getTableUtilisation() {
    const tables = await this.prisma.table.findMany({
      select: {
        id: true, number: true, status: true,
        floor:  { select: { name: true } },
        orders: {
          where:  { status: 'PAID' },
          select: { total: true },
        },
      },
    });

    return tables.map(t => ({
      id:       t.id,
      number:   t.number,
      floor:    t.floor.name,
      status:   t.status,
      totalPaid: t.orders.length,
      revenue:   parseFloat(t.orders.reduce((s, o) => s + o.total, 0).toFixed(2)),
    }));
  }
}
