import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import Anthropic from "@anthropic-ai/sdk";
import {
  DomainEvent,
  IssueStatus,
  type IssueUpdatedPayload,
} from "@pmgt/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AutoAssignService {
  private readonly logger = new Logger(AutoAssignService.name);
  private readonly anthropic: Anthropic;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.config.get<string>("ANTHROPIC_API_KEY") ?? "",
    });
  }

  async assignIssue(issueId: string, projectId: string): Promise<void> {
    try {
      const issue = await this.prisma.issue.findUnique({
        where: { id: issueId },
      });
      if (!issue || issue.assigneeId) return;

      const memberships = await this.prisma.projectMember.findMany({
        where: { projectId },
        include: { user: true },
      });

      if (memberships.length === 0) return;

      const memberProfiles = await Promise.all(
        memberships.map(async (m) => {
          const openCount = await this.prisma.issue.count({
            where: {
              projectId,
              assigneeId: m.userId,
              status: { not: IssueStatus.DONE },
            },
          });
          return { id: m.userId, name: m.user.name, role: m.role, openCount };
        }),
      );

      const model =
        this.config.get<string>("AI_ASSIGN_MODEL") ?? "claude-sonnet-4-6";

      const message = await this.anthropic.messages.create({
        model,
        max_tokens: 256,
        messages: [{ role: "user", content: this.buildPrompt(issue, memberProfiles) }],
      });

      const text = message.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("");

      const parsed = JSON.parse(text) as { userId: string; reasoning: string };
      const validId = memberProfiles.find((m) => m.id === parsed.userId)?.id;

      if (!validId) {
        this.logger.warn(
          `auto-assign: LLM returned unknown userId ${parsed.userId} for issue ${issueId}`,
        );
        return;
      }

      await this.prisma.issue.update({
        where: { id: issueId },
        data: { assigneeId: validId },
      });

      this.logger.log(
        `auto-assign: issue ${issueId} → ${validId} — ${parsed.reasoning}`,
      );

      const payload: IssueUpdatedPayload = {
        projectId,
        issueId,
        status: issue.status as IssueStatus,
      };
      this.events.emit(DomainEvent.IssueUpdated, payload);
    } catch (err) {
      this.logger.warn(
        `auto-assign: failed for issue ${issueId}: ${String(err)}`,
      );
    }
  }

  private buildPrompt(
    issue: {
      title: string;
      description: string | null;
      type: string;
      priority: string;
    },
    members: {
      id: string;
      name: string;
      role: string;
      openCount: number;
    }[],
  ): string {
    const teamLines = members
      .map(
        (m) =>
          `${m.id} | ${m.name} | Role: ${m.role} | Open issues: ${m.openCount}`,
      )
      .join("\n");

    return `You are a project-management AI. Assign the following task to exactly one team member.

TASK
Title: ${issue.title}
Description: ${issue.description ?? "None"}
Type: ${issue.type}
Priority: ${issue.priority}

TEAM MEMBERS
${teamLines}

Rules:
- Prefer members with lower open-issue counts (workload balance).
- Prefer ADMIN role for CRITICAL priority tasks.
- You must pick one of the listed user IDs.

Respond with ONLY valid JSON, no markdown fences:
{"userId":"<id>","reasoning":"<one sentence>"}`;
  }
}
