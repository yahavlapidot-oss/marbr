import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto, SendOtpDto, VerifyOtpDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Either email or phone is required');
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          dto.email ? { email: dto.email } : {},
          dto.phone ? { phone: dto.phone } : {},
        ].filter(Boolean),
      },
    });

    if (existing) {
      throw new ConflictException('User already exists with this email or phone');
    }

    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 12) : null;

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        gender: dto.gender,
        marketingConsent: dto.marketingConsent ?? false,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    const tokens = await this.generateTokens(user.id, user.role);
    return { user, ...tokens };
  }

  async login(dto: LoginDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Either email or phone is required');
    }

    const user = await this.prisma.user.findFirst({
      where: dto.email ? { email: dto.email } : { phone: dto.phone },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const tokens = await this.generateTokens(user.id, user.role);
    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      ...tokens,
    };
  }

  async sendOtp(dto: SendOtpDto) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await this.prisma.otpCode.create({
      data: { target: dto.target, code, expiresAt },
    });

    // TODO: send via Twilio / email provider
    console.log(`OTP for ${dto.target}: ${code}`);

    const isDev = this.config.get('NODE_ENV') !== 'production';
    return { message: 'OTP sent', ...(isDev && { devCode: code }) };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const record = await this.prisma.otpCode.findFirst({
      where: {
        target: dto.target,
        code: dto.code,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    await this.prisma.otpCode.update({
      where: { id: record.id },
      data: { used: true },
    });

    const isPhone = dto.target.startsWith('+');
    let user = await this.prisma.user.findFirst({
      where: isPhone ? { phone: dto.target } : { email: dto.target },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          fullName: dto.target,
          phone: isPhone ? dto.target : undefined,
          email: !isPhone ? dto.target : undefined,
          isVerified: true,
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });
    }

    const tokens = await this.generateTokens(user.id, user.role);
    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException();
      }

      return this.generateTokens(user.id, user.role);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateTokens(userId: string, role: string) {
    const payload = { sub: userId, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN') ?? '15m',
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') ?? '30d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
