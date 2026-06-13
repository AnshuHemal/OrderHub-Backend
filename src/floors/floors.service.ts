import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { CreateFloorDto, UpdateFloorDto, CreateTableDto, UpdateTableDto } from './dto/floor.dto';

@Injectable()
export class FloorsService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  // ── Floors ──────────────────────────────────────────────────────────────────

  findAllFloors() {
    return this.prisma.floor.findMany({
      orderBy: { position: 'asc' },
      include: { tables: { orderBy: { number: 'asc' } } },
    });
  }

  async createFloor(dto: CreateFloorDto) {
    return this.prisma.floor.create({ data: dto, include: { tables: true } });
  }

  async updateFloor(id: string, dto: UpdateFloorDto) {
    await this.findFloorOrThrow(id);
    return this.prisma.floor.update({ where: { id }, data: dto, include: { tables: true } });
  }

  async deleteFloor(id: string) {
    await this.findFloorOrThrow(id);
    return this.prisma.floor.delete({ where: { id } });
  }

  // ── Tables ──────────────────────────────────────────────────────────────────

  findAllTables(floorId: string) {
    return this.prisma.table.findMany({
      where:   { floorId },
      orderBy: { number: 'asc' },
    });
  }

  async createTable(floorId: string, dto: CreateTableDto) {
    await this.findFloorOrThrow(floorId);
    return this.prisma.table.create({ data: { ...dto, floorId } });
  }

  async updateTable(id: string, dto: UpdateTableDto) {
    await this.findTableOrThrow(id);
    const updated = await this.prisma.table.update({ where: { id }, data: dto });
    this.eventsGateway.server?.emit('table_updated', updated);
    return updated;
  }

  async updateTableStatus(id: string, status: string) {
    await this.findTableOrThrow(id);
    const updated = await this.prisma.table.update({ where: { id }, data: { status: status as never } });
    this.eventsGateway.server?.emit('table_updated', { id, status: updated.status });
    return updated;
  }

  async deleteTable(id: string) {
    await this.findTableOrThrow(id);
    return this.prisma.table.delete({ where: { id } });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async findFloorOrThrow(id: string) {
    const floor = await this.prisma.floor.findUnique({ where: { id } });
    if (!floor) throw new NotFoundException(`Floor ${id} not found`);
    return floor;
  }

  private async findTableOrThrow(id: string) {
    const table = await this.prisma.table.findUnique({ where: { id } });
    if (!table) throw new NotFoundException(`Table ${id} not found`);
    return table;
  }
}
