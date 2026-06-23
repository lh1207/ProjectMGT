import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { BoardDto, SprintDto, VelocityDto } from "@pmgt/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, type AuthUser } from "../common/current-user.decorator";
import {
  CompleteSprintDto,
  CreateSprintDto,
  UpdateSprintDto,
  VelocityQueryDto,
} from "./dto/sprint.dto";
import { SprintsService } from "./sprints.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class SprintsController {
  constructor(private readonly sprints: SprintsService) {}

  @Get("projects/:projectId/sprints")
  list(
    @Param("projectId") projectId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<SprintDto[]> {
    return this.sprints.list(projectId, user.userId);
  }

  @Post("projects/:projectId/sprints")
  create(
    @Param("projectId") projectId: string,
    @Body() dto: CreateSprintDto,
    @CurrentUser() user: AuthUser,
  ): Promise<SprintDto> {
    return this.sprints.create(projectId, dto, user.userId);
  }

  @Patch("sprints/:id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateSprintDto,
    @CurrentUser() user: AuthUser,
  ): Promise<SprintDto> {
    return this.sprints.update(id, dto, user.userId);
  }

  @Post("sprints/:id/start")
  start(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<SprintDto> {
    return this.sprints.start(id, user.userId);
  }

  @Post("sprints/:id/complete")
  complete(
    @Param("id") id: string,
    @Body() dto: CompleteSprintDto,
    @CurrentUser() user: AuthUser,
  ): Promise<SprintDto> {
    return this.sprints.complete(id, dto, user.userId);
  }

  @Get("sprints/:id/board")
  board(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<BoardDto> {
    return this.sprints.board(id, user.userId);
  }

  @Get("projects/:projectId/velocity")
  velocity(
    @Param("projectId") projectId: string,
    @Query() query: VelocityQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<VelocityDto> {
    return this.sprints.velocity(projectId, query.lastN ?? 3, user.userId);
  }
}
