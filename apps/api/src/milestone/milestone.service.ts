import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { Milestone } from "@prisma/client";
import {
  DomainEvent,
  IssueStatus,
  MilestoneStatus,
  type MilestoneDto,
  type MilestoneProgressDto,
  type MilestoneProgressPayload,
} from "@pmgt/shared";
import { ProjectAccessService } from "../common/project-access.service";
import { toMilestoneDto } from "../common/mappers";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CreateMilestoneDto,
  LinkSprintsDto,
  UpdateMilestoneDto,
} from "./dto/milestone.dto";
import { computeProgress, type StatusGroup } from "./progress.util";

@Injectable()
export class MilestoneService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly events: EventEmitter2,
  ) {}

  async list(projectId: string, userId: string): Promise<MilestoneDto[]> {
    await this.access.assertMember(projectId, userId);
    const milestones = await this.prisma.milestone.findMany({
      where: { projectId },
      orderBy: { targetDate: "asc" },
      include: { sprints: true },
    });
    return milestones.map((m) =>
      toMilestoneDto(
        m,
        m.sprints.map((s) => s.sprintId),
      ),
    );
  }

  async create(
    projectId: string,
    dto: CreateMilestoneDto,
    userId: string,
  ): Promise<MilestoneDto> {
    await this.access.assertMember(projectId, userId);

    if (dto.startDate && dto.startDate > dto.targetDate) {
      throw new BadRequestException("startDate must be on or before targetDate");
    }

    const sprintIds = dto.sprintIds ?? [];
    if (sprintIds.length) {
      await this.assertSprintsInProject(projectId, sprintIds);
      await this.assertTargetAfterSprints(dto.targetDate, sprintIds);
    }

    const milestone = await this.prisma.milestone.create({
      data: {
        projectId,
        name: dto.name,
        description: dto.description ?? null,
        status: MilestoneStatus.PLANNED,
        startDate: dto.startDate ?? null,
        targetDate: dto.targetDate,
        sprints: { create: sprintIds.map((sprintId) => ({ sprintId })) },
      },
      include: { sprints: true },
    });
    return toMilestoneDto(
      milestone,
      milestone.sprints.map((s) => s.sprintId),
    );
  }

  async get(milestoneId: string, userId: string): Promise<MilestoneDto> {
    const m = await this.getOrThrow(milestoneId, userId);
    const sprints = await this.prisma.milestoneSprint.findMany({
      where: { milestoneId },
      select: { sprintId: true },
    });
    return toMilestoneDto(
      m,
      sprints.map((s) => s.sprintId),
    );
  }

  async update(
    milestoneId: string,
    dto: UpdateMilestoneDto,
    userId: string,
  ): Promise<MilestoneDto> {
    const m = await this.getOrThrow(milestoneId, userId);
    const newTarget = dto.targetDate ?? m.targetDate;
    const newStart = dto.startDate ?? m.startDate;
    if (newStart && newStart > newTarget) {
      throw new BadRequestException("startDate must be on or before targetDate");
    }
    if (dto.targetDate) {
      const sprintLinks = await this.prisma.milestoneSprint.findMany({
        where: { milestoneId },
        select: { sprintId: true },
      });
      await this.assertTargetAfterSprints(
        dto.targetDate,
        sprintLinks.map((s) => s.sprintId),
      );
    }
    const updated = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.startDate !== undefined ? { startDate: dto.startDate } : {}),
        ...(dto.targetDate !== undefined ? { targetDate: dto.targetDate } : {}),
      },
      include: { sprints: true },
    });
    return toMilestoneDto(
      updated,
      updated.sprints.map((s) => s.sprintId),
    );
  }

  async remove(milestoneId: string, userId: string): Promise<void> {
    const m = await this.getOrThrow(milestoneId, userId);
    await this.prisma.milestone.delete({ where: { id: m.id } });
  }

  async linkSprints(
    milestoneId: string,
    dto: LinkSprintsDto,
    userId: string,
  ): Promise<MilestoneDto> {
    const m = await this.getOrThrow(milestoneId, userId);
    await this.assertSprintsInProject(m.projectId, dto.sprintIds);
    await this.assertTargetAfterSprints(m.targetDate, dto.sprintIds);

    for (const sprintId of dto.sprintIds) {
      await this.prisma.milestoneSprint.upsert({
        where: { milestoneId_sprintId: { milestoneId, sprintId } },
        create: { milestoneId, sprintId },
        update: {},
      });
    }
    return this.get(milestoneId, userId);
  }

  async progress(
    milestoneId: string,
    userId: string,
  ): Promise<MilestoneProgressDto> {
    const m = await this.getOrThrow(milestoneId, userId);
    return this.computeFor(m);
  }

  // Recompute + broadcast — invoked by the event listener (no user context).
  async recomputeAndEmit(milestoneId: string): Promise<void> {
    const m = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
    });
    if (!m) return;
    const progress = await this.computeFor(m);
    const payload: MilestoneProgressPayload = {
      projectId: m.projectId,
      milestoneId: m.id,
      status: m.status as MilestoneStatus,
      percent: progress.percent,
    };
    this.events.emit(DomainEvent.MilestoneProgress, payload);
  }

  // Find every milestone affected by an issue (directly linked or via its sprint).
  async milestonesForIssue(issueId: string): Promise<string[]> {
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
      select: { milestoneId: true, sprintId: true },
    });
    if (!issue) return [];
    const ids = new Set<string>();
    if (issue.milestoneId) ids.add(issue.milestoneId);
    if (issue.sprintId) {
      const links = await this.prisma.milestoneSprint.findMany({
        where: { sprintId: issue.sprintId },
        select: { milestoneId: true },
      });
      for (const l of links) ids.add(l.milestoneId);
    }
    return [...ids];
  }

  private async computeFor(m: Milestone): Promise<MilestoneProgressDto> {
    const sprintLinks = await this.prisma.milestoneSprint.findMany({
      where: { milestoneId: m.id },
      select: { sprintId: true },
    });
    const sprintIds = sprintLinks.map((s) => s.sprintId);

    // Single grouped query over the distinct issue set: issues directly linked to
    // the milestone OR belonging to any linked sprint. Prisma OR yields each row
    // once, so an issue matching both conditions is not double-counted.
    const grouped = await this.prisma.issue.groupBy({
      by: ["status"],
      where: {
        projectId: m.projectId,
        OR: [
          { milestoneId: m.id },
          ...(sprintIds.length ? [{ sprintId: { in: sprintIds } }] : []),
        ],
      },
      _count: { _all: true },
      _sum: { storyPoints: true },
    });

    const groups: StatusGroup[] = grouped.map((g) => ({
      status: g.status as IssueStatus,
      count: g._count._all,
      points: g._sum.storyPoints ?? 0,
    }));

    return computeProgress(m.id, groups, m.targetDate);
  }

  private async getOrThrow(
    milestoneId: string,
    userId: string,
  ): Promise<Milestone> {
    const m = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
    });
    if (!m) {
      throw new NotFoundException("Milestone not found");
    }
    await this.access.assertMember(m.projectId, userId);
    return m;
  }

  private async assertSprintsInProject(
    projectId: string,
    sprintIds: string[],
  ): Promise<void> {
    const count = await this.prisma.sprint.count({
      where: { id: { in: sprintIds }, projectId },
    });
    if (count !== sprintIds.length) {
      throw new BadRequestException(
        "One or more sprints are not in this project",
      );
    }
  }

  // targetDate must be on or after the latest endDate of any linked sprint.
  private async assertTargetAfterSprints(
    targetDate: Date,
    sprintIds: string[],
  ): Promise<void> {
    if (!sprintIds.length) return;
    const latest = await this.prisma.sprint.aggregate({
      where: { id: { in: sprintIds } },
      _max: { endDate: true },
    });
    const maxEnd = latest._max.endDate;
    if (maxEnd && targetDate < maxEnd) {
      throw new BadRequestException(
        "targetDate must be on or after the latest linked sprint end date",
      );
    }
  }
}
