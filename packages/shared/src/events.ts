import { IssueStatus, MilestoneStatus, SprintStatus } from "./enums";

// In-process event bus contract (NestJS EventEmitter) AND the Socket.IO wire format.
// The realtime gateway forwards these to the project room verbatim where noted.

export const DomainEvent = {
  IssueUpdated: "issue.updated",
  SprintUpdated: "sprint.updated",
  CommitCreated: "commit.created",
  PrOpened: "pr.opened",
  PrMerged: "pr.merged",
  PrClosed: "pr.closed",
  MilestoneProgress: "milestone.progress",
  IssueCreated: "issue.created",
} as const;
export type DomainEvent = (typeof DomainEvent)[keyof typeof DomainEvent];

export interface IssueUpdatedPayload {
  projectId: string;
  issueId: string;
  status: IssueStatus;
}

export interface IssueCreatedPayload {
  projectId: string;
  issueId: string;
  assigneeId: string | null;
}

export interface SprintUpdatedPayload {
  projectId: string;
  sprintId: string;
  status: SprintStatus;
}

export interface CommitCreatedPayload {
  projectId: string;
  repoId: string;
  commitId: string;
  refs: { issueId: string; action: string }[];
}

export interface PrOpenedPayload {
  projectId: string;
  repoId: string;
  prId: string;
  number: number;
}

export interface PrMergedPayload {
  projectId: string;
  repoId: string;
  prId: string;
  issueIds: string[];
}

export interface PrClosedPayload {
  projectId: string;
  repoId: string;
  prId: string;
}

export interface MilestoneProgressPayload {
  projectId: string;
  milestoneId: string;
  status: MilestoneStatus;
  percent: number;
}

export interface DomainEventPayloads {
  [DomainEvent.IssueUpdated]: IssueUpdatedPayload;
  [DomainEvent.SprintUpdated]: SprintUpdatedPayload;
  [DomainEvent.CommitCreated]: CommitCreatedPayload;
  [DomainEvent.PrOpened]: PrOpenedPayload;
  [DomainEvent.PrMerged]: PrMergedPayload;
  [DomainEvent.PrClosed]: PrClosedPayload;
  [DomainEvent.MilestoneProgress]: MilestoneProgressPayload;
  [DomainEvent.IssueCreated]: IssueCreatedPayload;
}
