import {
  Controller, Get, Post, Put, Delete,
  Param, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Coupons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('coupons')
export class CouponsController {
  constructor(private svc: CouponsService) {}

  @Get()
  @ApiOperation({ summary: 'List all coupons' })
  findAll() {
    return this.svc.findAll();
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get coupon details by coupon code' })
  findByCode(@Param('code') code: string) {
    return this.svc.findByCode(code);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get coupon details by ID' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new coupon (Admin only)' })
  create(@Body() dto: CreateCouponDto) {
    return this.svc.create(dto);
  }

  @Put(':id')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Update coupon details (Admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a coupon (Admin only)' })
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
