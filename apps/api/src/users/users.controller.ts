import {
  Controller,
  Get,
  NotFoundException,
  UseGuards,
} from "@nestjs/common";
import type { UserDto } from "@pmgt/shared";
import { CurrentUser, type AuthUser } from "../common/current-user.decorator";
import { toUserDto } from "../common/mappers";
import { PrismaService } from "../prisma/prisma.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("me")
  async me(@CurrentUser() user: AuthUser): Promise<UserDto> {
    const found = await this.prisma.user.findUnique({
      where: { id: user.userId },
    });
    if (!found) {
      throw new NotFoundException("User not found");
    }
    return toUserDto(found);
  }
}
