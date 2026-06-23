import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UserRole, type AuthTokensDto } from "@pmgt/shared";
import * as bcrypt from "bcryptjs";
import { toUserDto } from "../common/mappers";
import { PrismaService } from "../prisma/prisma.service";
import type { LoginDto, RegisterDto } from "./dto/auth.dto";
import type { JwtPayload } from "./jwt.strategy";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokensDto> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException("Email already registered");
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
        role: UserRole.MEMBER,
      },
    });
    return this.issueTokens(user.id, user.email, user.role, toUserDto(user));
  }

  async login(dto: LoginDto): Promise<AuthTokensDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid credentials");
    }
    return this.issueTokens(user.id, user.email, user.role, toUserDto(user));
  }

  async refresh(refreshToken: string): Promise<AuthTokensDto> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get<string>("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException("Invalid refresh token");
    }
    return this.issueTokens(user.id, user.email, user.role, toUserDto(user));
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: string,
    user: AuthTokensDto["user"],
  ): Promise<AuthTokensDto> {
    const payload: JwtPayload = { sub: userId, email, role };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>("JWT_ACCESS_SECRET"),
      expiresIn: this.config.get<string>("JWT_ACCESS_TTL") ?? "900s",
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>("JWT_REFRESH_SECRET"),
      expiresIn: this.config.get<string>("JWT_REFRESH_TTL") ?? "7d",
    });
    return { accessToken, refreshToken, user };
  }
}
