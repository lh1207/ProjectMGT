import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  // Test helper: truncate all tables in FK-safe order. Never call in production.
  async clearDatabase(): Promise<void> {
    await this.commitIssueRef.deleteMany();
    await this.issuePullRequest.deleteMany();
    await this.commit.deleteMany();
    await this.pullRequest.deleteMany();
    await this.repository.deleteMany();
    await this.milestoneSprint.deleteMany();
    await this.issue.deleteMany();
    await this.sprint.deleteMany();
    await this.milestone.deleteMany();
    await this.projectMember.deleteMany();
    await this.project.deleteMany();
    await this.user.deleteMany();
  }
}
