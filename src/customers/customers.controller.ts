import {
  Controller, Get, Post, Put, Delete,
  Param, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private svc: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'List all customers' })
  findAll() {
    return this.svc.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer details by ID' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new customer (Admin only)' })
  create(@Body() dto: CreateCustomerDto) {
    return this.svc.create(dto);
  }

  @Put(':id')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Update customer details (Admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a customer (Admin only)' })
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
