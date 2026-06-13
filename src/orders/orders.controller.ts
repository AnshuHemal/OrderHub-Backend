import {
  Controller, Get, Post, Put, Patch, Delete,
  Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto, AddItemsDto,
  UpdateOrderStatusDto, UpdateItemStatusDto, ProcessPaymentDto,
} from './dto/order.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private svc: OrdersService) {}

  // ── POS — create / read ────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateOrderDto,
  ) {
    return this.svc.createOrder(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List orders (optional status filter)' })
  @ApiQuery({ name: 'status', required: false })
  findAll(@Query('status') status?: string) {
    return this.svc.findAll(status);
  }

  @Get('kitchen')
  @ApiOperation({ summary: 'Kitchen queue — pending & preparing items' })
  kitchenQueue() {
    return this.svc.findKitchenQueue();
  }

  @Get('reports/daily')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Daily sales report' })
  dailyReport() {
    return this.svc.getDailyReport();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order detail' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  // ── Order mutations ────────────────────────────────────────────────────────

  @Post(':id/items')
  @ApiOperation({ summary: 'Add items to an existing order' })
  addItems(@Param('id') id: string, @Body() dto: AddItemsDto) {
    return this.svc.addItems(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.svc.updateStatus(id, dto);
  }

  @Patch(':id/transfer')
  @ApiOperation({ summary: 'Transfer order to another table' })
  transferTable(
    @Param('id') id: string,
    @Body('tableId') tableId: string,
  ) {
    return this.svc.transferTable(id, tableId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel an order' })
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id') id: string) {
    return this.svc.cancelOrder(id);
  }

  // ── Kitchen item status ────────────────────────────────────────────────────

  @Patch('items/:itemId/status')
  @ApiOperation({ summary: 'Update individual item status (kitchen use)' })
  updateItemStatus(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemStatusDto,
  ) {
    return this.svc.updateItemStatus(itemId, dto);
  }

  // ── Payment ────────────────────────────────────────────────────────────────

  @Post(':id/pay')
  @ApiOperation({ summary: 'Process payment for an order' })
  processPayment(
    @Param('id') id: string,
    @Body() dto: ProcessPaymentDto,
  ) {
    return this.svc.processPayment(id, dto);
  }
}
