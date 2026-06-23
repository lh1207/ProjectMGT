import { IssueStatus, type MilestoneProgressDto } from "@pmgt/shared";

export interface StatusGroup {
  status: IssueStatus;
  count: number;
  points: number; // summed storyPoints for this status (nulls treated as 0)
}

function emptyByStatus(): Record<IssueStatus, number> {
  return {
    [IssueStatus.BACKLOG]: 0,
    [IssueStatus.TODO]: 0,
    [IssueStatus.IN_PROGRESS]: 0,
    [IssueStatus.IN_REVIEW]: 0,
    [IssueStatus.DONE]: 0,
  };
}

// Pure aggregation. `groups` are already de-duplicated counts by status (a single
// grouped query over the milestone's distinct issue set — an issue that is both
// directly linked and in a linked sprint appears once). `now`/`targetDate` drive
// the at-risk heuristic.
export function computeProgress(
  milestoneId: string,
  groups: StatusGroup[],
  targetDate: Date,
  now: Date = new Date(),
): MilestoneProgressDto {
  const byStatus = emptyByStatus();
  let total = 0;
  let committedPoints = 0;
  let donePoints = 0;

  for (const g of groups) {
    byStatus[g.status] = g.count;
    total += g.count;
    committedPoints += g.points;
    if (g.status === IssueStatus.DONE) {
      donePoints += g.points;
    }
  }

  const done = byStatus[IssueStatus.DONE];
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  // At risk when the milestone is incomplete and either already past its target
  // date, or within the final 20% of its window with under 80% of work done.
  const complete = total > 0 && done === total;
  const overdue = now.getTime() > targetDate.getTime();
  const atRisk = !complete && (overdue || percent < 80 && nearDeadline(targetDate, now));

  return {
    milestoneId,
    total,
    done,
    percent,
    points: { committed: committedPoints, done: donePoints },
    byStatus,
    atRisk,
  };
}

// True when within 3 days of the target date (and not past it).
function nearDeadline(targetDate: Date, now: Date): boolean {
  const ms = targetDate.getTime() - now.getTime();
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  return ms >= 0 && ms <= threeDays;
}
