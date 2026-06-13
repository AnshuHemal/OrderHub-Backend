import {
  Controller, Get, Post, Put, Patch, Delete,
  Param, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FloorsService } from './floors.service';
import { CreateFloorDto, UpdateFloorDto, CreateTableDto, UpdateTableDto } from './dto/floor.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Floors & Tables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('floors')
export class FloorsController {
  constructor(private svc: FloorsService) {}

  // ── Floors ──────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Get all floors with tables' })
  findAll() { return this.svc.findAllFloors(); }

  @Post()
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Create a floor' })
  create(@Body() dto: CreateFloorDto) { return this.svc.createFloor(dto); }

  @Put(':id')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Update a floor' })
  update(@Param('id') id: string, @Body() dto: UpdateFloorDto) {
    return this.svc.updateFloor(id, dto);
  }

  @Delete(':id')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a floor' })
  remove(@Param('id') id: string) { return this.svc.deleteFloor(id); }

  // ── Tables ──────────────────────────────────────────────────────────────────

  @Get(':floorId/tables')
  @ApiOperation({ summary: 'Get tables for a floor' })
  getTables(@Param('floorId') floorId: string) { return this.svc.findAllTables(floorId); }

  @Post(':floorId/tables')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Create a table on a floor' })
  createTable(@Param('floorId') floorId: string, @Body() dto: CreateTableDto) {
    return this.svc.createTable(floorId, dto);
  }

  @Put('tables/:id')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Update a table' })
  updateTable(@Param('id') id: string, @Body() dto: UpdateTableDto) {
    return this.svc.updateTable(id, dto);
  }

  @Patch('tables/:id/status')
  @ApiOperation({ summary: 'Update table status (available/occupied/reserved/dirty)' })
  setStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.svc.updateTableStatus(id, status);
  }

  @Delete('tables/:id')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a table' })
  removeTable(@Param('id') id: string) { return this.svc.deleteTable(id); }
}
