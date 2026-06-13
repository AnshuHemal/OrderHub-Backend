import {
  Injectable, ConflictException, UnauthorizedException,
  NotFoundException, Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, UpdateProfileDto } from './dto/auth.dto';
import type { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma:  PrismaService,
    private jwt:     JwtService,
    private config:  ConfigService,
  ) {}

  // ── Register ────────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Email already in use');

    const hash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        name:  dto.name.trim(),
        email: dto.email.toLowerCase(),
        accounts: {
          create: {
            accountId:  dto.email.toLowerCase(),
            providerId: 'credential',
            password:   hash,
          },
        },
      },
      select: { id: true, email: true, name: true, role: true },
    });

    const tokens = await this.issueTokens({ sub: user.id, email: user.email, role: user.role });
    this.logger.log(`New user registered: ${user.email}`);
    return { user, ...tokens };
  }

  // ── Login ────────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { accounts: { where: { providerId: 'credential' }, select: { password: true } } },
    });

    if (!user) throw new UnauthorizedException('Invalid email or password');

    const account = user.accounts[0];
    if (!account?.password) throw new UnauthorizedException('Use OAuth to sign in');

    const valid = await bcrypt.compare(dto.password, account.password);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    const { accounts: _, ...safeUser } = user;
    const tokens = await this.issueTokens({ sub: user.id, email: user.email, role: user.role });

    this.logger.log(`User logged in: ${user.email}`);
    return { user: safeUser, ...tokens };
  }

  // ── Get profile ──────────────────────────────────────────────────────────────

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, image: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ── Update profile ───────────────────────────────────────────────────────────

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data:  { name: dto.name, image: dto.image },
      select: { id: true, name: true, email: true, role: true, image: true },
    });
  }

  // ── Token helpers ─────────────────────────────────────────────────────────────

  private async issueTokens(payload: JwtPayload) {
    const accessToken = this.jwt.sign(payload);
    return { accessToken };
  }
}
