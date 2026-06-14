import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenSessionDto, CloseSessionDto } from './dto/pos-session.dto';

@Injectable()
export class PosSessionsService {
  private readonly logger = new Logger(PosSessionsService.name);

  constructor(private prisma: PrismaService) {}

  async openSession(userId: string, dto: OpenSessionDto) {
    // Check if the user already has an active session
    const active = await this.prisma.posSession.findFirst({
      where: {
        openedBy: userId,
        status: 'OPEN',
      },
    });

    if (active) {
      this.logger.log(`User ${userId} already has an active session: ${active.id}`);
      return active;
    }

    const session = await this.prisma.posSession.create({
      data: {
        openedBy: userId,
        openingBalance: dto.openingBalance,
        status: 'OPEN',
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    this.logger.log(`Opened new POS session ${session.id} for user ${userId} with float ${dto.openingBalance}`);
    return session;
  }

  async getActiveSession(userId: string) {
    return this.prisma.posSession.findFirst({
      where: {
        openedBy: userId,
        status: 'OPEN',
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async closeSession(sessionId: string, userId: string, dto: CloseSessionDto) {
    const session = await this.prisma.posSession.findUnique({
      where: { id: sessionId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!session) {
      throw new NotFoundException(`POS Session with ID "${sessionId}" not found`);
    }

    if (session.status === 'CLOSED') {
      throw new BadRequestException(`POS Session with ID "${sessionId}" is already closed`);
    }

    const now = new Date();

    // Fetch all paid, non-voided orders linked to this session
    const orders = await this.prisma.order.findMany({
      where: {
        posSessionId: sessionId,
        status: 'PAID',
        voidedAt: null,
      },
      include: {
        payment: true,
        refunds: true,
      },
    });

    // Initialize total aggregations
    let cashSales = 0;
    let cardSales = 0;
    let upiSales = 0;
    let walletSales = 0;
    let totalSales = 0;
    let totalDiscounts = 0;

    let cashRefunds = 0;
    let cardRefunds = 0;
    let storeCreditRefunds = 0;
    let totalRefunds = 0;

    orders.forEach((order) => {
      totalSales += order.total;
      totalDiscounts += order.discount;

      if (order.payment) {
        const amt = order.payment.amount;
        if (order.payment.method === 'CASH') cashSales += amt;
        else if (order.payment.method === 'CARD') cardSales += amt;
        else if (order.payment.method === 'UPI') upiSales += amt;
        else if (order.payment.method === 'WALLET') walletSales += amt;
      }

      if (order.refunds && order.refunds.length > 0) {
        order.refunds.forEach((ref) => {
          totalRefunds += ref.amount;
          if (ref.refundMethod === 'CASH') cashRefunds += ref.amount;
          else if (ref.refundMethod === 'CARD') cardRefunds += ref.amount;
          else if (ref.refundMethod === 'STORE_CREDIT') storeCreditRefunds += ref.amount;
        });
      }
    });

    // Expected Cash in Drawer = Opening Balance + Cash Sales - Cash Refunds
    const expectedCash = session.openingBalance + cashSales - cashRefunds;
    const discrepancy = dto.countedCash - expectedCash;

    // Snapshot data for the Z-Report
    const zReportData = {
      sessionId: session.id,
      cashierName: session.user.name,
      openedAt: session.openedAt.toISOString(),
      closedAt: now.toISOString(),
      openingBalance: session.openingBalance,
      expectedCash: expectedCash,
      countedCash: dto.countedCash,
      discrepancy: discrepancy,
      salesCount: orders.length,
      salesBreakdown: {
        cash: cashSales,
        card: cardSales,
        upi: upiSales,
        wallet: walletSales,
        total: totalSales,
      },
      discountsTotal: totalDiscounts,
      refundsTotal: totalRefunds,
      refundsBreakdown: {
        cash: cashRefunds,
        card: cardRefunds,
        storeCredit: storeCreditRefunds,
      },
    };

    const updatedSession = await this.prisma.posSession.update({
      where: { id: sessionId },
      data: {
        closedAt: now,
        closingFloat: expectedCash,
        countedCash: dto.countedCash,
        discrepancy: discrepancy,
        status: 'CLOSED',
        zReportData: zReportData,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    this.logger.log(`Closed session ${sessionId}. Expected cash: ${expectedCash}, Counted: ${dto.countedCash}, Discrepancy: ${discrepancy}`);
    return updatedSession;
  }

  async findAllSessions() {
    return this.prisma.posSession.findMany({
      orderBy: { openedAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }
}
