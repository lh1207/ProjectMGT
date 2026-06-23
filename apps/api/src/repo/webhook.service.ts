import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { UserRole, PullRequestStatus } from "@pmgt/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CommitsService } from "./commits.service";
import type { GitWebhookDto } from "./dto/webhook.dto";
import { PullRequestsService } from "./pull-requests.service";

// Trusted ingress. Resolves an acting project member, then delegates to the same
// user-scoped services the REST API uses, so event emission and validation are
// identical whether a change arrives via UI or webhook.
@Injectable()
export class WebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commits: CommitsService,
    private readonly prs: PullRequestsService,
  ) {}

  async handle(dto: GitWebhookDto): Promise<{ processed: string }> {
    const repo = await this.prisma.repository.findUnique({
      where: { id: dto.repoId },
    });
    if (!repo) {
      throw new NotFoundException("Unknown repository");
    }
    const actingUserId = await this.resolveActor(repo.projectId);

    if (dto.event === "push") {
      const commits = dto.commits ?? [];
      const branch = dto.ref?.replace("refs/heads/", "") ?? repo.defaultBranch;
      for (const c of commits) {
        await this.commits.create(
          repo.id,
          {
            message: c.message,
            sha: c.id,
            authorEmail: c.author.email,
            authorName: c.author.name ?? c.author.email,
            branch,
          },
          actingUserId,
        );
      }
      return { processed: `push:${commits.length}` };
    }

    // pull_request event
    const pr = dto.pull_request;
    if (!pr) {
      throw new BadRequestException("pull_request payload missing");
    }
    if (dto.action === "opened") {
      await this.prs.create(
        repo.id,
        {
          title: pr.title,
          body: pr.body,
          sourceBranch: pr.head,
          targetBranch: pr.base,
          issueIds: pr.issueIds,
        },
        actingUserId,
      );
      return { processed: "pull_request:opened" };
    }
    if (dto.action === "closed") {
      if (dto.number === undefined) {
        throw new BadRequestException("number is required to close a PR");
      }
      const existing = await this.prisma.pullRequest.findUnique({
        where: { repositoryId_number: { repositoryId: repo.id, number: dto.number } },
      });
      if (!existing) {
        throw new NotFoundException("PR not found");
      }
      if (pr.merged) {
        await this.prs.merge(existing.id, actingUserId);
        return { processed: "pull_request:merged" };
      }
      await this.prs.setStatus(
        existing.id,
        PullRequestStatus.CLOSED,
        actingUserId,
      );
      return { processed: "pull_request:closed" };
    }
    throw new BadRequestException("Unsupported pull_request action");
  }

  private async resolveActor(projectId: string): Promise<string> {
    const admin = await this.prisma.projectMember.findFirst({
      where: { projectId, role: UserRole.ADMIN },
      orderBy: { createdAt: "asc" },
    });
    if (admin) return admin.userId;
    const any = await this.prisma.projectMember.findFirst({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });
    if (!any) {
      throw new BadRequestException("Project has no members to attribute action");
    }
    return any.userId;
  }
}
