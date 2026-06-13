import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'MANAGER')
@Controller('analytics')
export class AnalyticsController {
  constructor(private svc: AnalyticsService) {}

  @Get('revenue')
  @ApiOperation({ summary: 'Revenue summary for last N days' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  revenue(@Query('days') days?: number) {
    return this.svc.getRevenueSummary(days ? Number(days) : 7);
  }

  @Get('top-items')
  @ApiOperation({ summary: 'Top selling menu items' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  topItems(@Query('limit') limit?: number) {
    return this.svc.getTopItems(limit ? Number(limit) : 10);
  }

  @Get('hourly')
  @ApiOperation({ summary: "Today's hourly order distribution" })
  hourly() { return this.svc.getHourlyDistribution(); }

  @Get('tables')
  @ApiOperation({ summary: 'Table utilisation report' })
  tables() { return this.svc.getTableUtilisation(); }
}
