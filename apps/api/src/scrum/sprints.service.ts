import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { Sprint } from "@prisma/client";
import {
  BOARD_COLUMNS,
  DomainEvent,
  IssueStatus,
  SprintStatus,
  type BoardDto,
  type SprintDto,
  type SprintUpdatedPayload,
  type VelocityDto,
} from "@pmgt/shared";
import { ProjectAccessService } from "../common/project-access.service";
import { toIssueDto, toSprintDto } from "../common/mappers";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CompleteSprintDto,
  CreateSprintDto,
  UpdateSprintDto,
} from "./dto/sprint.dto";
import { computeVelocity } from "./velocity.util";

@Injectable()
export class SprintsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly events: EventEmitter2,
  ) {}

  async list(projectId: string, userId: string): Promise<SprintDto[]> {
    await this.access.assertMember(projectId, userId);
    const sprints = await this.prisma.sprint.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });
    return sprints.map(toSprintDto);
  }

  async create(
    projectId: string,
    dto: CreateSprintDto,
    userId: string,
  ): Promise<SprintDto> {
    await this.access.assertMember(projectId, userId);
    if (dto.startDate && dto.endDate && dto.startDate > dto.endDate) {
      throw new BadRequestException("startDate must be before endDate");
    }
    const sprint = await this.prisma.sprint.create({
      data: {
        projectId,
        name: dto.name,
        goal: dto.goal ?? null,
        status: SprintStatus.PLANNED,
        startDate: dto.startDate ?? null,
        endDate: dto.endDate ?? null,
      },
    });
    return toSprintDto(sprint);
  }

  async update(
    sprintId: string,
    dto: UpdateSprintDto,
    userId: string,
  ): Promise<SprintDto> {
    const sprint = await this.getOrThrow(sprintId, userId);
    if (sprint.status === SprintStatus.COMPLETED) {
      throw new BadRequestException("Cannot edit a completed sprint");
    }
    const updated = await this.prisma.sprint.update({
      where: { id: sprintId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.goal !== undefined ? { goal: dto.goal } : {}),
        ...(dto.startDate !== undefined ? { startDate: dto.startDate } : {}),
        ...(dto.endDate !== undefined ? { endDate: dto.endDate } : {}),
      },
    });
    return toSprintDto(updated);
  }

  async start(sprintId: string, userId: string): Promise<SprintDto> {
    const sprint = await this.getOrThrow(sprintId, userId);
    if (sprint.status !== SprintStatus.PLANNED) {
      throw new BadRequestException("Only a PLANNED sprint can be started");
    }
    const active = await this.prisma.sprint.findFirst({
      where: { projectId: sprint.projectId, status: SprintStatus.ACTIVE },
    });
    if (active) {
      throw new BadRequestException(
        "Another sprint is already active in this project",
      );
    }
    // Freeze committed points = sum of story points of issues in the sprint.
    const agg = await this.prisma.issue.aggregate({
      where: { sprintId },
      _sum: { storyPoints: true },
    });
    const updated = await this.prisma.sprint.update({
      where: { id: sprintId },
      data: {
        status: SprintStatus.ACTIVE,
        committedPoints: agg._sum.storyPoints ?? 0,
        startDate: sprint.startDate ?? new Date(),
      },
    });
    this.emitUpdated(updated);
    return toSprintDto(updated);
  }

  // Completing a sprint: freeze completedPoints (sum of DONE points), then roll
  // unfinished issues to a target sprint or back to the backlog.
  async complete(
    sprintId: string,
    dto: CompleteSprintDto,
    userId: string,
  ): Promise<SprintDto> {
    const sprint = await this.getOrThrow(sprintId, userId);
    if (sprint.status !== SprintStatus.ACTIVE) {
      throw new BadRequestException("Only an ACTIVE sprint can be completed");
    }

    if (dto.moveUnfinishedToSprintId) {
      const target = await this.prisma.sprint.findUnique({
        where: { id: dto.moveUnfinishedToSprintId },
      });
      if (!target || target.projectId !== sprint.projectId) {
        throw new NotFoundException("Target sprint not found in this project");
      }
      if (target.status === SprintStatus.COMPLETED) {
        throw new BadRequestException("Target sprint is completed");
      }
    }

    const doneAgg = await this.prisma.issue.aggregate({
      where: { sprintId, status: IssueStatus.DONE },
      _sum: { storyPoints: true },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.issue.updateMany({
        where: { sprintId, status: { not: IssueStatus.DONE } },
        data: {
          sprintId: dto.moveUnfinishedToSprintId ?? null,
          status: IssueStatus.BACKLOG,
        },
      });
      return tx.sprint.update({
        where: { id: sprintId },
        data: {
          status: SprintStatus.COMPLETED,
          completedPoints: doneAgg._sum.storyPoints ?? 0,
          endDate: sprint.endDate ?? new Date(),
        },
      });
    });

    this.emitUpdated(result);
    return toSprintDto(result);
  }

  async board(sprintId: string, userId: string): Promise<BoardDto> {
    const sprint = await this.getOrThrow(sprintId, userId);
    const issues = await this.prisma.issue.findMany({
      where: { sprintId: sprint.id },
      orderBy: { boardRank: "asc" },
    });
    const columns = BOARD_COLUMNS.map((status) => ({
      status,
      issues: issues
        .filter((i) => i.status === status)
        .map(toIssueDto),
    }));
    return { sprintId: sprint.id, columns };
  }

  async velocity(
    projectId: string,
    lastN: number,
    userId: string,
  ): Promise<VelocityDto> {
    await this.access.assertMember(projectId, userId);
    const completed = await this.prisma.sprint.findMany({
      where: { projectId, status: SprintStatus.COMPLETED },
      orderBy: { endDate: "asc" },
      select: {
        id: true,
        name: true,
        committedPoints: true,
        completedPoints: true,
      },
    });
    return computeVelocity(
      completed.map((s) => ({
        sprintId: s.id,
        sprintName: s.name,
        committedPoints: s.committedPoints,
        completedPoints: s.completedPoints,
      })),
      lastN,
    );
  }

  private async getOrThrow(sprintId: string, userId: string): Promise<Sprint> {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
    });
    if (!sprint) {
      throw new NotFoundException("Sprint not found");
    }
    await this.access.assertMember(sprint.projectId, userId);
    return sprint;
  }

  private emitUpdated(sprint: Sprint): void {
    const payload: SprintUpdatedPayload = {
      projectId: sprint.projectId,
      sprintId: sprint.id,
      status: sprint.status as SprintStatus,
    };
    this.events.emit(DomainEvent.SprintUpdated, payload);
  }
}
