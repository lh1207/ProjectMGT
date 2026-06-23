import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { PullRequest } from "@prisma/client";
import {
  DomainEvent,
  PullRequestStatus,
  type PrClosedPayload,
  type PrMergedPayload,
  type PrOpenedPayload,
  type PullRequestDto,
} from "@pmgt/shared";
import { ProjectAccessService } from "../common/project-access.service";
import { toPullRequestDto } from "../common/mappers";
import { PrismaService } from "../prisma/prisma.service";
import type { CreatePullRequestDto } from "./dto/repo.dto";
import { RepositoriesService } from "./repositories.service";

@Injectable()
export class PullRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly repos: RepositoriesService,
    private readonly events: EventEmitter2,
  ) {}

  async list(repoId: string, userId: string): Promise<PullRequestDto[]> {
    await this.repos.getOrThrow(repoId, userId);
    const prs = await this.prisma.pullRequest.findMany({
      where: { repositoryId: repoId },
      orderBy: { number: "desc" },
      include: { issues: true },
    });
    return prs.map((p) =>
      toPullRequestDto(
        p,
        p.issues.map((i) => i.issueId),
      ),
    );
  }

  async create(
    repoId: string,
    dto: CreatePullRequestDto,
    userId: string,
  ): Promise<PullRequestDto> {
    const repo = await this.repos.getOrThrow(repoId, userId);

    // Per-repo monotonic PR number.
    const last = await this.prisma.pullRequest.findFirst({
      where: { repositoryId: repoId },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    const number = (last?.number ?? 0) + 1;

    const issueIds = dto.issueIds ?? [];
    if (issueIds.length) {
      const count = await this.prisma.issue.count({
        where: { id: { in: issueIds }, projectId: repo.projectId },
      });
      if (count !== issueIds.length) {
        throw new BadRequestException(
          "One or more issueIds are not in this project",
        );
      }
    }

    const pr = await this.prisma.pullRequest.create({
      data: {
        repositoryId: repoId,
        number,
        title: dto.title,
        body: dto.body ?? null,
        status: PullRequestStatus.OPEN,
        sourceBranch: dto.sourceBranch,
        targetBranch: dto.targetBranch ?? repo.defaultBranch,
        authorId: userId,
        issues: { create: issueIds.map((issueId) => ({ issueId })) },
      },
      include: { issues: true },
    });

    const opened: PrOpenedPayload = {
      projectId: repo.projectId,
      repoId,
      prId: pr.id,
      number: pr.number,
    };
    this.events.emit(DomainEvent.PrOpened, opened);

    return toPullRequestDto(
      pr,
      pr.issues.map((i) => i.issueId),
    );
  }

  async setStatus(
    prId: string,
    status: PullRequestStatus,
    userId: string,
  ): Promise<PullRequestDto> {
    const pr = await this.getOrThrow(prId, userId);
    if (status === PullRequestStatus.MERGED) {
      return this.merge(prId, userId);
    }
    if (pr.status === PullRequestStatus.MERGED) {
      throw new BadRequestException("A merged PR cannot change status");
    }
    const updated = await this.prisma.pullRequest.update({
      where: { id: prId },
      data: { status },
      include: { issues: true },
    });
    if (status === PullRequestStatus.CLOSED) {
      const closed: PrClosedPayload = {
        projectId: await this.projectId(updated.repositoryId),
        repoId: updated.repositoryId,
        prId: updated.id,
      };
      this.events.emit(DomainEvent.PrClosed, closed);
    }
    return toPullRequestDto(
      updated,
      updated.issues.map((i) => i.issueId),
    );
  }

  // Merge: mark MERGED and emit pr.merged with linked issue ids. The scrum and
  // milestone modules react via the event bus — no direct cross-module calls.
  async merge(prId: string, userId: string): Promise<PullRequestDto> {
    const pr = await this.getOrThrow(prId, userId);
    if (pr.status !== PullRequestStatus.OPEN) {
      throw new BadRequestException("Only an OPEN PR can be merged");
    }
    const updated = await this.prisma.pullRequest.update({
      where: { id: prId },
      data: { status: PullRequestStatus.MERGED, mergedAt: new Date() },
      include: { issues: true },
    });
    const linkedIssueIds = updated.issues.map((i) => i.issueId);
    const projectId = await this.projectId(updated.repositoryId);
    if (linkedIssueIds.length) {
      const validCount = await this.prisma.issue.count({
        where: { id: { in: linkedIssueIds }, projectId },
      });
      if (validCount !== linkedIssueIds.length) {
        throw new BadRequestException(
          "One or more linked issues are not in this project",
        );
      }
    }
    const issueIds = linkedIssueIds;

    const merged: PrMergedPayload = {
      projectId,
      repoId: updated.repositoryId,
      prId: updated.id,
      issueIds,
    };
    this.events.emit(DomainEvent.PrMerged, merged);

    return toPullRequestDto(updated, issueIds);
  }

  private async getOrThrow(
    prId: string,
    userId: string,
  ): Promise<PullRequest> {
    const pr = await this.prisma.pullRequest.findUnique({
      where: { id: prId },
      include: { repository: true },
    });
    if (!pr) {
      throw new NotFoundException("Pull request not found");
    }
    await this.access.assertMember(pr.repository.projectId, userId);
    return pr;
  }

  private async projectId(repoId: string): Promise<string> {
    const repo = await this.prisma.repository.findUniqueOrThrow({
      where: { id: repoId },
      select: { projectId: true },
    });
    return repo.projectId;
  }
}
