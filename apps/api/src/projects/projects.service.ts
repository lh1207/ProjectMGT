import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { UserRole, type ProjectDto, type UserDto } from "@pmgt/shared";
import { ProjectAccessService } from "../common/project-access.service";
import { toProjectDto, toUserDto } from "../common/mappers";
import { PrismaService } from "../prisma/prisma.service";
import type {
  AddMemberDto,
  CreateProjectDto,
  UpdateProjectDto,
} from "./dto/project.dto";

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  async create(dto: CreateProjectDto, userId: string): Promise<ProjectDto> {
    const existing = await this.prisma.project.findUnique({
      where: { key: dto.key },
    });
    if (existing) {
      throw new ConflictException("Project key already in use");
    }
    const project = await this.prisma.project.create({
      data: {
        key: dto.key,
        name: dto.name,
        description: dto.description ?? null,
        members: {
          create: { userId, role: UserRole.ADMIN },
        },
      },
    });
    return toProjectDto(project);
  }

  async listForUser(userId: string): Promise<ProjectDto[]> {
    const projects = await this.prisma.project.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: "desc" },
    });
    return projects.map(toProjectDto);
  }

  async getById(projectId: string, userId: string): Promise<ProjectDto> {
    await this.access.assertMember(projectId, userId);
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException("Project not found");
    }
    return toProjectDto(project);
  }

  async update(
    projectId: string,
    dto: UpdateProjectDto,
    userId: string,
  ): Promise<ProjectDto> {
    await this.access.assertMember(projectId, userId);
    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
      },
    });
    return toProjectDto(project);
  }

  async listMembers(projectId: string, userId: string): Promise<UserDto[]> {
    await this.access.assertMember(projectId, userId);
    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });
    return members.map((m) => toUserDto(m.user));
  }

  async addMember(
    projectId: string,
    dto: AddMemberDto,
    userId: string,
  ): Promise<UserDto> {
    await this.access.assertMember(projectId, userId);
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) {
      throw new NotFoundException("User with that email not found");
    }
    await this.prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: user.id } },
      create: { projectId, userId: user.id, role: UserRole.MEMBER },
      update: {},
    });
    return toUserDto(user);
  }

  // Atomically allocate the next issue key (e.g. PMGT-12). Used by the scrum module.
  async nextIssueKey(projectId: string): Promise<string> {
    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: { issueSeq: { increment: 1 } },
      select: { key: true, issueSeq: true },
    });
    return `${project.key}-${project.issueSeq}`;
  }
}
