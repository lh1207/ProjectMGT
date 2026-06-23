import type { VelocityDto, VelocityPointDto } from "@pmgt/shared";

export interface CompletedSprintPoints {
  sprintId: string;
  sprintName: string;
  committedPoints: number;
  completedPoints: number;
}

// Pure velocity calculation: average completed story points across the most recent
// `lastN` completed sprints. Input must already be filtered to COMPLETED sprints,
// ordered oldest→newest. Returns an empty/zero result when there is no history.
export function computeVelocity(
  completedSprints: CompletedSprintPoints[],
  lastN = 3,
): VelocityDto {
  const window = completedSprints.slice(-Math.max(1, lastN));
  const sprints: VelocityPointDto[] = window.map((s) => ({
    sprintId: s.sprintId,
    sprintName: s.sprintName,
    committedPoints: s.committedPoints,
    completedPoints: s.completedPoints,
  }));

  if (sprints.length === 0) {
    return { averageVelocity: 0, sprints: [] };
  }

  const total = sprints.reduce((sum, s) => sum + s.completedPoints, 0);
  const averageVelocity = Math.round((total / sprints.length) * 10) / 10;
  return { averageVelocity, sprints };
}
