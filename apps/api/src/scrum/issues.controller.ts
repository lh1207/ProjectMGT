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
import type { IssueDto } from "@pmgt/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, type AuthUser } from "../common/current-user.decorator";
import {
  CreateIssueDto,
  MoveIssueDto,
  RankIssueDto,
  UpdateIssueDto,
} from "./dto/issue.dto";
import { IssuesService } from "./issues.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class IssuesController {
  constructor(private readonly issues: IssuesService) {}

  @Get("projects/:projectId/issues")
  list(
    @Param("projectId") projectId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<IssueDto[]> {
    return this.issues.list(projectId, user.userId);
  }

  @Post("projects/:projectId/issues")
  create(
    @Param("projectId") projectId: string,
    @Body() dto: CreateIssueDto,
    @CurrentUser() user: AuthUser,
  ): Promise<IssueDto> {
    return this.issues.create(projectId, dto, user.userId);
  }

  @Get("issues/:id")
  get(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<IssueDto> {
    return this.issues.get(id, user.userId);
  }

  @Patch("issues/:id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateIssueDto,
    @CurrentUser() user: AuthUser,
  ): Promise<IssueDto> {
    return this.issues.update(id, dto, user.userId);
  }

  @Delete("issues/:id")
  @HttpCode(204)
  async remove(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.issues.remove(id, user.userId);
  }

  @Patch("issues/:id/move")
  move(
    @Param("id") id: string,
    @Body() dto: MoveIssueDto,
    @CurrentUser() user: AuthUser,
  ): Promise<IssueDto> {
    return this.issues.move(id, dto, user.userId);
  }

  @Patch("issues/:id/rank")
  rank(
    @Param("id") id: string,
    @Body() dto: RankIssueDto,
    @CurrentUser() user: AuthUser,
  ): Promise<IssueDto> {
    return this.issues.rank(id, dto, user.userId);
  }
}
