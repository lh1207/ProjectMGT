import type { MilestoneDto, MilestoneProgressDto } from "@pmgt/shared";

export interface MilestoneProgressCardProps {
  milestone: MilestoneDto;
  progress?: MilestoneProgressDto;
}

// Presentational: renders a milestone's progress bar, point totals, and at-risk
// flag. No data fetching — values are passed in.
export function MilestoneProgressCard({
  milestone,
  progress,
}: MilestoneProgressCardProps) {
  const percent = progress?.percent ?? 0;
  const atRisk = progress?.atRisk ?? false;

  return (
    <div
      data-testid={`milestone-${milestone.id}`}
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{milestone.name}</h3>
        {atRisk && (
          <span
            data-testid="at-risk"
            className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700"
          >
            At risk
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500">
        Target {new Date(milestone.targetDate).toLocaleDateString()}
      </p>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          data-testid="progress-bar"
          className={`h-full ${atRisk ? "bg-red-500" : "bg-green-500"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
        <span>{percent}% complete</span>
        {progress && (
          <span>
            {progress.done}/{progress.total} issues ·{" "}
            {progress.points.done}/{progress.points.committed} pts
          </span>
        )}
      </div>
    </div>
  );
}
