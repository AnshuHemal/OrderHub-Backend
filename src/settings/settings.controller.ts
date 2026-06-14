import { Controller, Get, Body, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private svc: SettingsService) {}

  @Get('payment-methods')
  @ApiOperation({ summary: 'Get all payment methods configurations' })
  getPaymentMethods() {
    return this.svc.getPaymentMethods();
  }

  @Patch('payment-methods')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Update payment methods (Admin/Manager only)' })
  updatePaymentMethods(@Body() methods: any[]) {
    return this.svc.updatePaymentMethods(methods);
  }
}
