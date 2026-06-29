import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { Issue } from "@prisma/client";
import {
  DomainEvent,
  IssueStatus,
  SprintStatus,
  canTransition,
  rankBetween,
  type IssueDto,
  type IssueUpdatedPayload,
  type IssueCreatedPayload,
} from "@pmgt/shared";
import { ProjectAccessService } from "../common/project-access.service";
import { toIssueDto } from "../common/mappers";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectsService } from "../projects/projects.service";
import type {
  CreateIssueDto,
  MoveIssueDto,
  RankIssueDto,
  UpdateIssueDto,
} from "./dto/issue.dto";

@Injectable()
export class IssuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly projects: ProjectsService,
    private readonly events: EventEmitter2,
  ) {}

  async list(projectId: string, userId: string): Promise<IssueDto[]> {
    await this.access.assertMember(projectId, userId);
    const issues = await this.prisma.issue.findMany({
      where: { projectId },
      orderBy: [{ status: "asc" }, { boardRank: "asc" }],
    });
    return issues.map(toIssueDto);
  }

  async getOrThrow(issueId: string, userId: string): Promise<Issue> {
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
    });
    if (!issue) {
      throw new NotFoundException("Issue not found");
    }
    await this.access.assertMember(issue.projectId, userId);
    return issue;
  }

  async get(issueId: string, userId: string): Promise<IssueDto> {
    return toIssueDto(await this.getOrThrow(issueId, userId));
  }

  async create(
    projectId: string,
    dto: CreateIssueDto,
    userId: string,
  ): Promise<IssueDto> {
    await this.access.assertMember(projectId, userId);

    if (dto.sprintId) {
      await this.assertSprintOpen(projectId, dto.sprintId);
    }

    const key = await this.projects.nextIssueKey(projectId);
    // New issues land at the bottom of the BACKLOG rank order.
    const last = await this.prisma.issue.findFirst({
      where: { projectId, status: IssueStatus.BACKLOG },
      orderBy: { boardRank: "desc" },
      select: { boardRank: true },
    });
    const boardRank = rankBetween(last?.boardRank ?? null, null);

    const issue = await this.prisma.issue.create({
      data: {
        projectId,
        key,
        title: dto.title,
        description: dto.description ?? null,
        type: dto.type ?? "TASK",
        priority: dto.priority ?? "MEDIUM",
        status: IssueStatus.BACKLOG,
        storyPoints: dto.storyPoints ?? null,
        sprintId: dto.sprintId ?? null,
        milestoneId: dto.milestoneId ?? null,
        assigneeId: dto.assigneeId ?? null,
        reporterId: userId,
        boardRank,
      },
    });
    this.emitUpdated(issue);
    this.emitCreated(issue);
    return toIssueDto(issue);
  }

  async update(
    issueId: string,
    dto: UpdateIssueDto,
    userId: string,
  ): Promise<IssueDto> {
    const issue = await this.getOrThrow(issueId, userId);
    if (dto.sprintId) {
      await this.assertSprintOpen(issue.projectId, dto.sprintId);
    }
    const updated = await this.prisma.issue.update({
      where: { id: issueId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.storyPoints !== undefined
          ? { storyPoints: dto.storyPoints }
          : {}),
        ...(dto.assigneeId !== undefined ? { assigneeId: dto.assigneeId } : {}),
        ...(dto.sprintId !== undefined ? { sprintId: dto.sprintId } : {}),
        ...(dto.milestoneId !== undefined
          ? { milestoneId: dto.milestoneId }
          : {}),
      },
    });
    this.emitUpdated(updated);
    return toIssueDto(updated);
  }

  async remove(issueId: string, userId: string): Promise<void> {
    const issue = await this.getOrThrow(issueId, userId);
    await this.prisma.issue.delete({ where: { id: issue.id } });
  }

  // Board transition: enforces the shared state machine, then re-ranks within the
  // destination column. Rejects moves into a COMPLETED sprint.
  async move(
    issueId: string,
    dto: MoveIssueDto,
    userId: string,
  ): Promise<IssueDto> {
    const issue = await this.getOrThrow(issueId, userId);

    if (!canTransition(issue.status as IssueStatus, dto.status)) {
      throw new BadRequestException(
        `Illegal transition ${issue.status} → ${dto.status}`,
      );
    }
    if (issue.sprintId) {
      await this.assertSprintOpen(issue.projectId, issue.sprintId);
    }

    const boardRank = await this.computeRank(
      issue.projectId,
      dto.status,
      dto.beforeId,
      dto.afterId,
      issue.id,
    );

    const closing =
      dto.status === IssueStatus.DONE && issue.status !== IssueStatus.DONE;
    const reopening =
      issue.status === IssueStatus.DONE && dto.status !== IssueStatus.DONE;

    const updated = await this.prisma.issue.update({
      where: { id: issue.id },
      data: {
        status: dto.status,
        boardRank,
        ...(closing ? { closedAt: new Date() } : {}),
        ...(reopening ? { closedAt: null } : {}),
      },
    });
    this.emitUpdated(updated);
    return toIssueDto(updated);
  }

  async rank(
    issueId: string,
    dto: RankIssueDto,
    userId: string,
  ): Promise<IssueDto> {
    const issue = await this.getOrThrow(issueId, userId);
    const boardRank = await this.computeRank(
      issue.projectId,
      issue.status as IssueStatus,
      dto.beforeId,
      dto.afterId,
      issue.id,
    );
    const updated = await this.prisma.issue.update({
      where: { id: issue.id },
      data: { boardRank },
    });
    return toIssueDto(updated);
  }

  // Automation hook (called by repo module via event handler): force an issue to DONE.
  async closeIssue(issueId: string, projectId?: string): Promise<void> {
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
    });
    if (!issue || issue.status === IssueStatus.DONE) return;
    if (projectId && issue.projectId !== projectId) return;
    const updated = await this.prisma.issue.update({
      where: { id: issueId },
      data: { status: IssueStatus.DONE, closedAt: new Date() },
    });
    this.emitUpdated(updated);
  }

  private async computeRank(
    projectId: string,
    status: IssueStatus,
    beforeId: string | undefined,
    afterId: string | undefined,
    selfId: string,
  ): Promise<string> {
    const before = beforeId
      ? await this.prisma.issue.findUnique({
          where: { id: beforeId },
          select: { boardRank: true },
        })
      : null;
    const after = afterId
      ? await this.prisma.issue.findUnique({
          where: { id: afterId },
          select: { boardRank: true },
        })
      : null;

    if (before || after) {
      return rankBetween(before?.boardRank ?? null, after?.boardRank ?? null);
    }
    // No neighbours specified → append to the end of the destination column.
    const last = await this.prisma.issue.findFirst({
      where: { projectId, status, id: { not: selfId } },
      orderBy: { boardRank: "desc" },
      select: { boardRank: true },
    });
    return rankBetween(last?.boardRank ?? null, null);
  }

  private async assertSprintOpen(
    projectId: string,
    sprintId: string,
  ): Promise<void> {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
    });
    if (!sprint || sprint.projectId !== projectId) {
      throw new NotFoundException("Sprint not found in this project");
    }
    if (sprint.status === SprintStatus.COMPLETED) {
      throw new BadRequestException("Cannot modify issues in a completed sprint");
    }
  }

  private emitUpdated(issue: Issue): void {
    const payload: IssueUpdatedPayload = {
      projectId: issue.projectId,
      issueId: issue.id,
      status: issue.status as IssueStatus,
    };
    this.events.emit(DomainEvent.IssueUpdated, payload);
  }

  private emitCreated(issue: Issue): void {
    const payload: IssueCreatedPayload = {
      projectId: issue.projectId,
      issueId: issue.id,
      assigneeId: issue.assigneeId,
    };
    this.events.emit(DomainEvent.IssueCreated, payload);
  }
}
