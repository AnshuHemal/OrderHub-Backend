import { Controller, Get, Body, Patch, UseGuards, Post } from '@nestjs/common';
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

  @Get('printer')
  @ApiOperation({ summary: 'Get printer configurations' })
  getPrinterSettings() {
    return this.svc.getPrinterSettings();
  }

  @Patch('printer')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Update printer configurations (Admin/Manager only)' })
  updatePrinterSettings(@Body() settings: any) {
    return this.svc.updatePrinterSettings(settings);
  }

  @Post('printer/print-network')
  @ApiOperation({ summary: 'Send ESC/POS raw bytes via TCP to network printer' })
  printNetwork(@Body() body: { ip: string; port: number; base64Data: string }) {
    return this.svc.printToNetwork(body.ip, body.port, body.base64Data);
  }
}
