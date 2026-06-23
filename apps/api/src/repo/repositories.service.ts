import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Repository } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { RepoProvider, type RepositoryDto } from "@pmgt/shared";
import { ProjectAccessService } from "../common/project-access.service";
import { toRepositoryDto } from "../common/mappers";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateRepoDto } from "./dto/repo.dto";

@Injectable()
export class RepositoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  async list(projectId: string, userId: string): Promise<RepositoryDto[]> {
    await this.access.assertMember(projectId, userId);
    const repos = await this.prisma.repository.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });
    return repos.map(toRepositoryDto);
  }

  async create(
    projectId: string,
    dto: CreateRepoDto,
    userId: string,
  ): Promise<RepositoryDto> {
    await this.access.assertMember(projectId, userId);
    const existing = await this.prisma.repository.findUnique({
      where: { projectId_slug: { projectId, slug: dto.slug } },
    });
    if (existing) {
      throw new ConflictException("Repository slug already in use");
    }
    const repo = await this.prisma.repository.create({
      data: {
        projectId,
        name: dto.name,
        slug: dto.slug,
        defaultBranch: dto.defaultBranch ?? "main",
        provider: RepoProvider.SIMULATED,
        webhookSecret: randomBytes(32).toString("hex"),
      },
    });
    return toRepositoryDto(repo);
  }

  async getOrThrow(repoId: string, userId: string): Promise<Repository> {
    const repo = await this.prisma.repository.findUnique({
      where: { id: repoId },
    });
    if (!repo) {
      throw new NotFoundException("Repository not found");
    }
    await this.access.assertMember(repo.projectId, userId);
    return repo;
  }

  async get(repoId: string, userId: string): Promise<RepositoryDto> {
    return toRepositoryDto(await this.getOrThrow(repoId, userId));
  }
}
