import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, UpdateBookingStatusDto } from './dto/booking.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private svc: BookingsService) {}

  @Get()
  @ApiOperation({ summary: 'List all bookings' })
  findAll() {
    return this.svc.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking details by ID' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new table booking' })
  create(@Body() dto: CreateBookingDto) {
    return this.svc.create(dto);
  }

  @Patch(':id/status')
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Update booking reservation status' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateBookingStatusDto) {
    return this.svc.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a table booking' })
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
