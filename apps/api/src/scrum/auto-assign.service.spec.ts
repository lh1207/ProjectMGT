import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AutoAssignService } from "./auto-assign.service";

type MockPrisma = {
  issue: {
    findUnique: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
  };
  projectMember: { findMany: jest.Mock };
};

const baseIssue = {
  id: "issue-1",
  projectId: "proj-1",
  assigneeId: null,
  title: "Fix login bug",
  description: "Users cannot log in",
  type: "BUG",
  priority: "HIGH",
  status: "BACKLOG",
};

const members = [
  { userId: "user-a", role: "ADMIN", user: { name: "Alice" } },
  { userId: "user-b", role: "MEMBER", user: { name: "Bob" } },
];

function makePrisma(openCounts = [1, 3]): MockPrisma {
  return {
    issue: {
      findUnique: jest.fn().mockResolvedValue(baseIssue),
      count: jest
        .fn()
        .mockResolvedValueOnce(openCounts[0])
        .mockResolvedValueOnce(openCounts[1]),
      update: jest.fn().mockResolvedValue({ ...baseIssue, assigneeId: "user-a" }),
    },
    projectMember: { findMany: jest.fn().mockResolvedValue(members) },
  };
}

function makeService(
  prisma: MockPrisma,
  configVars: Record<string, string | undefined>,
  llmResponse: unknown,
): { svc: AutoAssignService; emitter: EventEmitter2 } {
  const config = {
    get: (key: string) => configVars[key],
  } as unknown as ConfigService;

  const emitter = { emit: jest.fn() } as unknown as EventEmitter2;
  const svc = new AutoAssignService(prisma as never, config, emitter);

  (svc as unknown as { anthropic: unknown }).anthropic = {
    messages: {
      create: jest.fn().mockResolvedValue({ content: llmResponse }),
    },
  };

  return { svc, emitter };
}

describe("AutoAssignService", () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  });

  it("assigns the userId returned by the LLM", async () => {
    const prisma = makePrisma();
    const { svc, emitter } = makeService(
      prisma,
      { ANTHROPIC_API_KEY: "test-key" },
      [{ type: "text", text: '{"userId":"user-a","reasoning":"lower workload"}' }],
    );

    await svc.assignIssue("issue-1", "proj-1");

    expect(prisma.issue.update).toHaveBeenCalledWith({
      where: { id: "issue-1" },
      data: { assigneeId: "user-a" },
    });
    expect(emitter.emit).toHaveBeenCalledWith(
      "issue.updated",
      expect.objectContaining({ issueId: "issue-1" }),
    );
  });

  it("skips update when LLM returns malformed JSON", async () => {
    const prisma = makePrisma();
    const { svc } = makeService(
      prisma,
      { ANTHROPIC_API_KEY: "test-key" },
      [{ type: "text", text: "I cannot decide right now." }],
    );

    await svc.assignIssue("issue-1", "proj-1");

    expect(prisma.issue.update).not.toHaveBeenCalled();
  });

  it("skips update when LLM SDK throws", async () => {
    const prisma = makePrisma();
    const { svc } = makeService(prisma, { ANTHROPIC_API_KEY: "test-key" }, []);
    (
      (
        svc as unknown as {
          anthropic: { messages: { create: jest.Mock } };
        }
      ).anthropic.messages.create
    ).mockRejectedValue(new Error("network error"));

    await svc.assignIssue("issue-1", "proj-1");

    expect(prisma.issue.update).not.toHaveBeenCalled();
  });

  it("skips update when LLM returns unknown userId", async () => {
    const prisma = makePrisma();
    const { svc } = makeService(
      prisma,
      { ANTHROPIC_API_KEY: "test-key" },
      [{ type: "text", text: '{"userId":"ghost-user","reasoning":"..."}' }],
    );

    await svc.assignIssue("issue-1", "proj-1");

    expect(prisma.issue.update).not.toHaveBeenCalled();
  });

  it("skips entirely when issue already has an assignee", async () => {
    const prisma: MockPrisma = {
      issue: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ ...baseIssue, assigneeId: "user-a" }),
        count: jest.fn(),
        update: jest.fn(),
      },
      projectMember: { findMany: jest.fn() },
    };
    const { svc } = makeService(prisma, { ANTHROPIC_API_KEY: "test-key" }, []);

    await svc.assignIssue("issue-1", "proj-1");

    expect(prisma.projectMember.findMany).not.toHaveBeenCalled();
    expect(prisma.issue.update).not.toHaveBeenCalled();
  });
});
