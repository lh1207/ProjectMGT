import type {
  Commit,
  Issue,
  Milestone,
  Project,
  PullRequest,
  Repository,
  Sprint,
  User,
} from "@prisma/client";
import type {
  CommitDto,
  IssueDto,
  IssueStatus,
  MilestoneDto,
  ProjectDto,
  PullRequestDto,
  RepositoryDto,
  SprintDto,
  UserDto,
} from "@pmgt/shared";

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

export function toUserDto(u: User): UserDto {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl,
    role: u.role as UserDto["role"],
    createdAt: u.createdAt.toISOString(),
  };
}

export function toProjectDto(p: Project): ProjectDto {
  return {
    id: p.id,
    key: p.key,
    name: p.name,
    description: p.description,
    createdAt: p.createdAt.toISOString(),
  };
}

export function toSprintDto(s: Sprint): SprintDto {
  return {
    id: s.id,
    projectId: s.projectId,
    name: s.name,
    goal: s.goal,
    status: s.status as SprintDto["status"],
    startDate: iso(s.startDate),
    endDate: iso(s.endDate),
    committedPoints: s.committedPoints,
    completedPoints: s.completedPoints,
  };
}

export function toIssueDto(i: Issue): IssueDto {
  return {
    id: i.id,
    projectId: i.projectId,
    sprintId: i.sprintId,
    milestoneId: i.milestoneId,
    key: i.key,
    title: i.title,
    description: i.description,
    type: i.type as IssueDto["type"],
    status: i.status as IssueStatus,
    priority: i.priority as IssueDto["priority"],
    storyPoints: i.storyPoints,
    boardRank: i.boardRank,
    assigneeId: i.assigneeId,
    reporterId: i.reporterId,
    createdAt: i.createdAt.toISOString(),
    closedAt: iso(i.closedAt),
  };
}

export function toRepositoryDto(r: Repository): RepositoryDto {
  return {
    id: r.id,
    projectId: r.projectId,
    name: r.name,
    slug: r.slug,
    defaultBranch: r.defaultBranch,
    provider: r.provider,
    webhookSecret: r.webhookSecret,
    createdAt: r.createdAt.toISOString(),
  };
}

export function toCommitDto(
  c: Commit,
  linkedIssueIds: string[] = [],
): CommitDto {
  return {
    id: c.id,
    repositoryId: c.repositoryId,
    sha: c.sha,
    message: c.message,
    authorEmail: c.authorEmail,
    authorName: c.authorName,
    branch: c.branch,
    committedAt: c.committedAt.toISOString(),
    pullRequestId: c.pullRequestId,
    linkedIssueIds,
  };
}

export function toPullRequestDto(
  p: PullRequest,
  linkedIssueIds: string[] = [],
): PullRequestDto {
  return {
    id: p.id,
    repositoryId: p.repositoryId,
    number: p.number,
    title: p.title,
    body: p.body,
    status: p.status as PullRequestDto["status"],
    sourceBranch: p.sourceBranch,
    targetBranch: p.targetBranch,
    authorId: p.authorId,
    createdAt: p.createdAt.toISOString(),
    mergedAt: iso(p.mergedAt),
    linkedIssueIds,
  };
}

export function toMilestoneDto(
  m: Milestone,
  sprintIds: string[] = [],
): MilestoneDto {
  return {
    id: m.id,
    projectId: m.projectId,
    name: m.name,
    description: m.description,
    status: m.status as MilestoneDto["status"],
    startDate: iso(m.startDate),
    targetDate: m.targetDate.toISOString(),
    createdAt: m.createdAt.toISOString(),
    sprintIds,
  };
}
