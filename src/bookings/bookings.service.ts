import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { CreateBookingDto } from './dto/booking.dto';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  async findAll() {
    return this.prisma.booking.findMany({
      orderBy: { bookingTime: 'desc' },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        table:    { select: { id: true, number: true, seats: true } },
      },
    });
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        table:    { select: { id: true, number: true, seats: true } },
      },
    });
    if (!booking) throw new NotFoundException(`Booking with ID "${id}" not found`);
    return booking;
  }

  async create(dto: CreateBookingDto) {
    // Verify Customer exists
    const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
    if (!customer) throw new NotFoundException(`Customer with ID "${dto.customerId}" not found`);

    // Verify Table exists
    const table = await this.prisma.table.findUnique({ where: { id: dto.tableId } });
    if (!table) throw new NotFoundException(`Table with ID "${dto.tableId}" not found`);

    const booking = await this.prisma.booking.create({
      data: {
        customerId:  dto.customerId,
        tableId:     dto.tableId,
        bookingTime: new Date(dto.bookingTime),
        guestsCount: dto.guestsCount,
        notes:       dto.notes || null,
        status:      'pending',
      },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        table:    { select: { id: true, number: true, seats: true } },
      },
    });

    this.logger.log(`Booking created: ${booking.id} for Table ${table.number}`);
    this.eventsGateway.broadcast('bookingsUpdated', { bookingId: booking.id, type: 'created' });
    return booking;
  }

  async updateStatus(id: string, status: string) {
    const existing = await this.findOne(id);
    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        table:    { select: { id: true, number: true, seats: true } },
      },
    });

    this.logger.log(`Booking ${id} status updated to: ${status}`);
    this.eventsGateway.broadcast('bookingsUpdated', { bookingId: id, type: 'updated', status });
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    const deleted = await this.prisma.booking.delete({
      where: { id },
    });

    this.logger.log(`Booking deleted: ${id}`);
    this.eventsGateway.broadcast('bookingsUpdated', { bookingId: id, type: 'deleted' });
    return deleted;
  }
}
