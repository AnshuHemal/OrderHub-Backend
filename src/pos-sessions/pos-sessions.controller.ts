import {
  Controller, Get, Post, Param, Body, UseGuards, NotFoundException
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PosSessionsService } from './pos-sessions.service';
import { OpenSessionDto, CloseSessionDto } from './dto/pos-session.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('POS Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pos-sessions')
export class PosSessionsController {
  constructor(private readonly svc: PosSessionsService) {}

  @Post('open')
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Open a new POS shift session' })
  open(@CurrentUser() user: { id: string }, @Body() dto: OpenSessionDto) {
    return this.svc.openSession(user.id, dto);
  }

  @Get('active')
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Get current active POS shift session for the logged in user' })
  getActive(@CurrentUser() user: { id: string }) {
    return this.svc.getActiveSession(user.id);
  }

  @Post(':id/close')
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Close POS shift session and generate Z-Report data' })
  close(
    @Param('id') sessionId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CloseSessionDto
  ) {
    return this.svc.closeSession(sessionId, user.id, dto);
  }

  @Get()
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'List all historical POS shift sessions' })
  findAll() {
    return this.svc.findAllSessions();
  }

  @Get(':id/z-report')
  @Roles('OWNER', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Get Z-Report snapshot data for a session' })
  async getZReportData(@Param('id') id: string) {
    // Direct db access is fine here or we could delegate, but let's query the session data
    // to return the zReportData snapshot
    const session = await this.svc.findAllSessions().then(sessions =>
      sessions.find(s => s.id === id)
    );
    if (!session) {
      throw new NotFoundException(`POS Session with ID "${id}" not found`);
    }
    return session.zReportData;
  }
}
