import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import type {
  CommitDto,
  PullRequestDto,
  RepositoryDto,
} from "@pmgt/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, type AuthUser } from "../common/current-user.decorator";
import { CommitsService } from "./commits.service";
import {
  CreateCommitDto,
  CreatePullRequestDto,
  CreateRepoDto,
  UpdatePullRequestStatusDto,
} from "./dto/repo.dto";
import { PullRequestsService } from "./pull-requests.service";
import { RepositoriesService } from "./repositories.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class RepoController {
  constructor(
    private readonly repos: RepositoriesService,
    private readonly commits: CommitsService,
    private readonly prs: PullRequestsService,
  ) {}

  @Get("projects/:projectId/repos")
  listRepos(
    @Param("projectId") projectId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<RepositoryDto[]> {
    return this.repos.list(projectId, user.userId);
  }

  @Post("projects/:projectId/repos")
  createRepo(
    @Param("projectId") projectId: string,
    @Body() dto: CreateRepoDto,
    @CurrentUser() user: AuthUser,
  ): Promise<RepositoryDto> {
    return this.repos.create(projectId, dto, user.userId);
  }

  @Get("repos/:id")
  getRepo(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<RepositoryDto> {
    return this.repos.get(id, user.userId);
  }

  @Get("repos/:id/commits")
  listCommits(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<CommitDto[]> {
    return this.commits.list(id, user.userId);
  }

  @Post("repos/:id/commits")
  createCommit(
    @Param("id") id: string,
    @Body() dto: CreateCommitDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CommitDto> {
    return this.commits.create(id, dto, user.userId);
  }

  @Get("repos/:id/pulls")
  listPulls(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<PullRequestDto[]> {
    return this.prs.list(id, user.userId);
  }

  @Post("repos/:id/pulls")
  createPull(
    @Param("id") id: string,
    @Body() dto: CreatePullRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PullRequestDto> {
    return this.prs.create(id, dto, user.userId);
  }

  @Patch("pulls/:id")
  updatePull(
    @Param("id") id: string,
    @Body() dto: UpdatePullRequestStatusDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PullRequestDto> {
    return this.prs.setStatus(id, dto.status, user.userId);
  }

  @Post("pulls/:id/merge")
  mergePull(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<PullRequestDto> {
    return this.prs.merge(id, user.userId);
  }
}
