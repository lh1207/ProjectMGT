import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { randomBytes } from "node:crypto";
import {
  CommitRefAction,
  DomainEvent,
  type CommitCreatedPayload,
  type CommitDto,
} from "@pmgt/shared";
import { toCommitDto } from "../common/mappers";
import { PrismaService } from "../prisma/prisma.service";
import { parseCommitMessage } from "./commit-parser";
import type { CreateCommitDto } from "./dto/repo.dto";
import { RepositoriesService } from "./repositories.service";

@Injectable()
export class CommitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repos: RepositoriesService,
    private readonly events: EventEmitter2,
  ) {}

  async list(repoId: string, userId: string): Promise<CommitDto[]> {
    await this.repos.getOrThrow(repoId, userId);
    const commits = await this.prisma.commit.findMany({
      where: { repositoryId: repoId },
      orderBy: { committedAt: "desc" },
      include: { issueRefs: true },
    });
    return commits.map((c) =>
      toCommitDto(
        c,
        c.issueRefs.map((r) => r.issueId),
      ),
    );
  }

  async create(
    repoId: string,
    dto: CreateCommitDto,
    userId: string,
  ): Promise<CommitDto> {
    const repo = await this.repos.getOrThrow(repoId, userId);
    const project = await this.prisma.project.findUniqueOrThrow({
      where: { id: repo.projectId },
      select: { key: true },
    });

    const parsed = parseCommitMessage(dto.message, project.key);
    // Resolve parsed issue keys to real issues in this project.
    const issues = parsed.length
      ? await this.prisma.issue.findMany({
          where: {
            projectId: repo.projectId,
            key: { in: parsed.map((p) => p.issueKey) },
          },
          select: { id: true, key: true },
        })
      : [];
    const idByKey = new Map(issues.map((i) => [i.key, i.id]));

    const refs = parsed
      .map((p) => {
        const issueId = idByKey.get(p.issueKey);
        return issueId ? { issueId, action: p.action } : null;
      })
      .filter(
        (r): r is { issueId: string; action: CommitRefAction } => r !== null,
      );

    const sha = dto.sha ?? randomBytes(20).toString("hex");

    if (dto.pullRequestId) {
      const pr = await this.prisma.pullRequest.findUnique({
        where: { id: dto.pullRequestId },
        select: { repositoryId: true },
      });
      if (!pr) {
        throw new NotFoundException("Pull request not found");
      }
      if (pr.repositoryId !== repoId) {
        throw new BadRequestException(
          "pullRequestId does not belong to this repository",
        );
      }
    }

    const commit = await this.prisma.commit.create({
      data: {
        repositoryId: repoId,
        sha,
        message: dto.message,
        authorEmail: dto.authorEmail,
        authorName: dto.authorName,
        branch: dto.branch ?? repo.defaultBranch,
        pullRequestId: dto.pullRequestId ?? null,
        issueRefs: {
          create: refs.map((r) => ({
            issueId: r.issueId,
            action: r.action,
          })),
        },
      },
    });

    // If the commit belongs to a PR, surface its issue links onto that PR so a
    // future merge closes them.
    if (dto.pullRequestId && refs.length) {
      for (const r of refs) {
        await this.prisma.issuePullRequest.upsert({
          where: {
            issueId_pullRequestId: {
              issueId: r.issueId,
              pullRequestId: dto.pullRequestId,
            },
          },
          create: { issueId: r.issueId, pullRequestId: dto.pullRequestId },
          update: {},
        });
      }
    }

    const payload: CommitCreatedPayload = {
      projectId: repo.projectId,
      repoId,
      commitId: commit.id,
      refs,
    };
    this.events.emit(DomainEvent.CommitCreated, payload);

    return toCommitDto(
      commit,
      refs.map((r) => r.issueId),
    );
  }

  // Resolve a repo's project key — used by the webhook normalizer.
  async projectIdForRepo(repoId: string): Promise<string> {
    const repo = await this.prisma.repository.findUnique({
      where: { id: repoId },
      select: { projectId: true },
    });
    if (!repo) throw new NotFoundException("Repository not found");
    return repo.projectId;
  }
}
