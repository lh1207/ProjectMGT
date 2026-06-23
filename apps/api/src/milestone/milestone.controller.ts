import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import type { MilestoneDto, MilestoneProgressDto } from "@pmgt/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, type AuthUser } from "../common/current-user.decorator";
import {
  CreateMilestoneDto,
  LinkSprintsDto,
  UpdateMilestoneDto,
} from "./dto/milestone.dto";
import { MilestoneService } from "./milestone.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class MilestoneController {
  constructor(private readonly milestones: MilestoneService) {}

  @Get("projects/:projectId/milestones")
  list(
    @Param("projectId") projectId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<MilestoneDto[]> {
    return this.milestones.list(projectId, user.userId);
  }

  @Post("projects/:projectId/milestones")
  create(
    @Param("projectId") projectId: string,
    @Body() dto: CreateMilestoneDto,
    @CurrentUser() user: AuthUser,
  ): Promise<MilestoneDto> {
    return this.milestones.create(projectId, dto, user.userId);
  }

  @Get("milestones/:id")
  get(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<MilestoneDto> {
    return this.milestones.get(id, user.userId);
  }

  @Patch("milestones/:id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateMilestoneDto,
    @CurrentUser() user: AuthUser,
  ): Promise<MilestoneDto> {
    return this.milestones.update(id, dto, user.userId);
  }

  @Delete("milestones/:id")
  @HttpCode(204)
  async remove(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.milestones.remove(id, user.userId);
  }

  @Post("milestones/:id/sprints")
  linkSprints(
    @Param("id") id: string,
    @Body() dto: LinkSprintsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<MilestoneDto> {
    return this.milestones.linkSprints(id, dto, user.userId);
  }

  @Get("milestones/:id/progress")
  progress(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<MilestoneProgressDto> {
    return this.milestones.progress(id, user.userId);
  }
}
