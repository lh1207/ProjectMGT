// Single source of truth for all domain enums.
// SQLite (via Prisma) has no native enum type, so these are stored as String columns.
// Always import from @pmgt/shared — never redefine these literals elsewhere.

export const UserRole = {
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const SprintStatus = {
  PLANNED: "PLANNED",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
} as const;
export type SprintStatus = (typeof SprintStatus)[keyof typeof SprintStatus];

export const IssueType = {
  STORY: "STORY",
  BUG: "BUG",
  TASK: "TASK",
  EPIC: "EPIC",
} as const;
export type IssueType = (typeof IssueType)[keyof typeof IssueType];

export const IssueStatus = {
  BACKLOG: "BACKLOG",
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  IN_REVIEW: "IN_REVIEW",
  DONE: "DONE",
} as const;
export type IssueStatus = (typeof IssueStatus)[keyof typeof IssueStatus];

// Board columns, in display order. BACKLOG is intentionally excluded — it is the
// pre-board pool. The Kanban board renders TODO → IN_PROGRESS → IN_REVIEW → DONE.
export const BOARD_COLUMNS: IssueStatus[] = [
  IssueStatus.TODO,
  IssueStatus.IN_PROGRESS,
  IssueStatus.IN_REVIEW,
  IssueStatus.DONE,
];

export const IssuePriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const;
export type IssuePriority = (typeof IssuePriority)[keyof typeof IssuePriority];

export const PullRequestStatus = {
  OPEN: "OPEN",
  MERGED: "MERGED",
  CLOSED: "CLOSED",
} as const;
export type PullRequestStatus =
  (typeof PullRequestStatus)[keyof typeof PullRequestStatus];

export const CommitRefAction = {
  REFS: "REFS",
  FIXES: "FIXES",
  CLOSES: "CLOSES",
} as const;
export type CommitRefAction =
  (typeof CommitRefAction)[keyof typeof CommitRefAction];

export const MilestoneStatus = {
  PLANNED: "PLANNED",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
} as const;
export type MilestoneStatus =
  (typeof MilestoneStatus)[keyof typeof MilestoneStatus];

export const RepoProvider = {
  SIMULATED: "SIMULATED",
  GITHUB: "GITHUB",
} as const;
export type RepoProvider = (typeof RepoProvider)[keyof typeof RepoProvider];
