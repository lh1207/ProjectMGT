import {
  IssuePriority,
  IssueStatus,
  IssueType,
  MilestoneStatus,
  PullRequestStatus,
  SprintStatus,
  UserRole,
} from "./enums";

// Wire-format response shapes shared between API and SPA. Dates are ISO strings
// over the wire. The API derives these from Prisma rows; the SPA consumes them.

export interface UserDto {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string;
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}

export interface ProjectDto {
  id: string;
  key: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface SprintDto {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  status: SprintStatus;
  startDate: string | null;
  endDate: string | null;
  committedPoints: number;
  completedPoints: number;
}

export interface IssueDto {
  id: string;
  projectId: string;
  sprintId: string | null;
  milestoneId: string | null;
  key: string;
  title: string;
  description: string | null;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  storyPoints: number | null;
  boardRank: string;
  assigneeId: string | null;
  reporterId: string;
  createdAt: string;
  closedAt: string | null;
}

export interface BoardColumnDto {
  status: IssueStatus;
  issues: IssueDto[];
}

export interface BoardDto {
  sprintId: string;
  columns: BoardColumnDto[];
}

export interface VelocityPointDto {
  sprintId: string;
  sprintName: string;
  committedPoints: number;
  completedPoints: number;
}

export interface VelocityDto {
  averageVelocity: number;
  sprints: VelocityPointDto[];
}

export interface RepositoryDto {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  defaultBranch: string;
  provider: string;
  webhookSecret: string;
  createdAt: string;
}

export interface CommitDto {
  id: string;
  repositoryId: string;
  sha: string;
  message: string;
  authorEmail: string;
  authorName: string;
  branch: string;
  committedAt: string;
  pullRequestId: string | null;
  linkedIssueIds: string[];
}

export interface PullRequestDto {
  id: string;
  repositoryId: string;
  number: number;
  title: string;
  body: string | null;
  status: PullRequestStatus;
  sourceBranch: string;
  targetBranch: string;
  authorId: string;
  createdAt: string;
  mergedAt: string | null;
  linkedIssueIds: string[];
}

export interface MilestoneDto {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  status: MilestoneStatus;
  startDate: string | null;
  targetDate: string;
  createdAt: string;
  sprintIds: string[];
}

export interface MilestoneProgressDto {
  milestoneId: string;
  total: number;
  done: number;
  percent: number;
  points: { committed: number; done: number };
  byStatus: Record<IssueStatus, number>;
  atRisk: boolean;
}
