import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail, IsString, MinLength, MaxLength,
  IsOptional, IsEnum,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Jane Smith' })
  @IsString() @MinLength(2) @MaxLength(80)
  name: string;

  @ApiProperty({ example: 'jane@cafe.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString() @MinLength(8) @MaxLength(100)
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'jane@cafe.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString() @MinLength(1)
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(80)
  name?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300)
  image?: string;
}

export class GoogleLoginDto {
  @ApiProperty({ example: 'ya29.a0AfB_byE...' })
  @IsString()
  accessToken: string;
}

export class SendOtpDto {
  @ApiProperty({ example: 'jane@cafe.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'email-verification' })
  @IsString()
  type: string;
}

export class VerifyEmailDto {
  @ApiProperty({ example: 'jane@cafe.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString() @MinLength(6) @MaxLength(6)
  otp: string;
}

