import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import type { ProjectDto, UserDto } from "@pmgt/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, type AuthUser } from "../common/current-user.decorator";
import {
  AddMemberDto,
  CreateProjectDto,
  UpdateProjectDto,
} from "./dto/project.dto";
import { ProjectsService } from "./projects.service";

@Controller("projects")
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Post()
  create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ProjectDto> {
    return this.projects.create(dto, user.userId);
  }

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<ProjectDto[]> {
    return this.projects.listForUser(user.userId);
  }

  @Get(":id")
  get(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ProjectDto> {
    return this.projects.getById(id, user.userId);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ProjectDto> {
    return this.projects.update(id, dto, user.userId);
  }

  @Get(":id/members")
  members(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<UserDto[]> {
    return this.projects.listMembers(id, user.userId);
  }

  @Post(":id/members")
  addMember(
    @Param("id") id: string,
    @Body() dto: AddMemberDto,
    @CurrentUser() user: AuthUser,
  ): Promise<UserDto> {
    return this.projects.addMember(id, dto, user.userId);
  }
}
