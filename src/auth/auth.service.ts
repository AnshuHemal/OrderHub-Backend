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
import { EmailsService } from '../emails/emails.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma:  PrismaService,
    private jwt:     JwtService,
    private config:  ConfigService,
    private emails:  EmailsService,
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

    this.logger.log(`New user registered: ${user.email}`);

    try {
      await this.sendVerificationOtp(user.email, 'email-verification');
    } catch (e: any) {
      this.logger.error(`Failed to send initial verification OTP for ${user.email}: ${e.message}`);
    }

    return { user };
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

    if (!user.emailVerified) {
      try {
        await this.sendVerificationOtp(user.email, 'email-verification');
      } catch (e: any) {
        this.logger.error(`Failed to send verification OTP on login attempt for ${user.email}: ${e.message}`);
      }
      throw new UnauthorizedException('Email not verified. We sent a verification code to your email.');
    }

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

  // ── Google Login ──────────────────────────────────────────────────────────────

  async googleLogin(accessToken: string) {
    try {
      const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`);
      if (!response.ok) {
        throw new UnauthorizedException('Invalid Google access token');
      }
      const googleUser = (await response.json()) as {
        sub: string;
        email?: string;
        name?: string;
        given_name?: string;
        picture?: string;
        email_verified?: boolean;
      };

      if (!googleUser.email) {
        throw new UnauthorizedException('Could not retrieve email from Google');
      }

      const email = googleUser.email.toLowerCase();
      const name = googleUser.name || googleUser.given_name || 'Google User';
      const image = googleUser.picture || null;
      const googleId = googleUser.sub;

      // Check if user exists
      let user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Create user
        user = await this.prisma.user.create({
          data: {
            name,
            email,
            emailVerified: googleUser.email_verified || false,
            image,
            role: 'STAFF', // default role
          },
        });
      } else if (image && !user.image) {
        // Update user image if not set
        await this.prisma.user.update({
          where: { id: user.id },
          data: { image },
        });
      }

      // Find or create social account link
      const account = await this.prisma.account.findFirst({
        where: {
          userId: user.id,
          providerId: 'google',
        },
      });

      if (!account) {
        await this.prisma.account.create({
          data: {
            userId: user.id,
            providerId: 'google',
            accountId: googleId,
          },
        });
      }

      const tokens = await this.issueTokens({ sub: user.id, email: user.email, role: user.role });
      return { user, ...tokens };

    } catch (err: any) {
      this.logger.error(`Google login error: ${err.message}`);
      throw new UnauthorizedException(err.message || 'Google authentication failed');
    }
  }

  // ── Token helpers ─────────────────────────────────────────────────────────────

  private async issueTokens(payload: JwtPayload) {
    const accessToken = this.jwt.sign(payload);
    return { accessToken };
  }

  // ── OTP Email Verification ───────────────────────────────────────────────────

  async sendVerificationOtp(email: string, type: string) {
    const emailLower = email.toLowerCase();
    
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { email: emailLower },
    });
    if (!user) throw new NotFoundException('User not found');

    // Purge existing verification codes for this identifier
    await this.prisma.verification.deleteMany({
      where: { identifier: emailLower },
    });

    // Generate 6-char alphanumeric OTP
    const OTP_LENGTH = 6;
    const OTP_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const otp = Array.from({ length: OTP_LENGTH }, () =>
      OTP_CHARSET[Math.floor(Math.random() * OTP_CHARSET.length)],
    ).join('');

    // Set expiration (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Save in DB
    await this.prisma.verification.create({
      data: {
        identifier: emailLower,
        value: otp,
        expiresAt,
      },
    });

    // Build subject and HTML template matching TREXO
    const subject = this.getOtpSubject(type);
    const heading = this.getOtpHeading(type);
    const body = this.getOtpBody(type);
    const html = this.buildOTPEmailHTML(otp, heading, body);

    // Dispatch email
    await this.emails.sendEmail(emailLower, subject, html);
    
    return { success: true };
  }

  async verifyEmail(email: string, otp: string) {
    const emailLower = email.toLowerCase();
    const otpClean = otp.toUpperCase().trim();

    const verification = await this.prisma.verification.findFirst({
      where: {
        identifier: emailLower,
        value: otpClean,
      },
    });

    if (!verification) {
      throw new UnauthorizedException('Invalid verification code');
    }

    if (verification.expiresAt < new Date()) {
      throw new UnauthorizedException('Verification code has expired');
    }

    // Update user status
    await this.prisma.user.update({
      where: { email: emailLower },
      data: { emailVerified: true },
    });

    // Delete verification record
    await this.prisma.verification.delete({
      where: { id: verification.id },
    });

    return { success: true };
  }

  private getOtpSubject(type: string): string {
    switch (type) {
      case 'email-verification': return 'Verify your OrderHub account';
      case 'sign-in':            return 'Your OrderHub sign-in code';
      case 'forget-password':    return 'Reset your OrderHub password';
      case 'change-email':       return 'Confirm your new OrderHub email';
      default:                   return 'Your OrderHub verification code';
    }
  }

  private getOtpHeading(type: string): string {
    switch (type) {
      case 'email-verification': return 'Verify your email address';
      case 'sign-in':            return 'Your sign-in code';
      case 'forget-password':    return 'Reset your password';
      case 'change-email':       return 'Confirm your new email';
      default:                   return 'Verification Code';
    }
  }

  private getOtpBody(type: string): string {
    switch (type) {
      case 'email-verification':
        return 'Enter the code below to verify your email address and activate your OrderHub account.';
      case 'sign-in':
        return 'Enter the code below to sign in to your OrderHub account.';
      case 'forget-password':
        return 'Enter the code below to reset your OrderHub password.';
      case 'change-email':
        return 'Enter the code below to confirm your new email address on your OrderHub account.';
      default:
        return 'Enter the code below to verify your request.';
    }
  }

  private buildOTPEmailHTML(otp: string, heading: string, body: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Inter,ui-sans-serif,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #e4e4e7;overflow:hidden;">
        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #f4f4f5;">
            <span style="font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#18181b;">OrderHub</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#18181b;">${heading}</h1>
            <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#71717a;">${body}</p>
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
              <tr>
                <td style="background:#f4f4f5;border-radius:12px;padding:16px 24px;">
                  <span style="font-size:28px;font-weight:800;letter-spacing:6px;color:#18181b;font-family:'Courier New',monospace;">${otp}</span>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;font-size:13px;color:#a1a1aa;">This code expires in <strong style="color:#71717a;">10 minutes</strong>.</p>
            <p style="margin:0;font-size:13px;color:#a1a1aa;">If you didn't request this, you can safely ignore this email.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f4f4f5;">
            <p style="margin:0;font-size:12px;color:#a1a1aa;">© ${new Date().getFullYear()} OrderHub. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
  }
}

