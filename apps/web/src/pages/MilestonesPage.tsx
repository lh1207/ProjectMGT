import type { MilestoneDto } from "@pmgt/shared";
import { useParams } from "react-router-dom";
import { MilestoneProgressCard } from "../features/milestones/MilestoneProgressCard";
import {
  useMilestoneProgressList,
  useMilestones,
} from "../features/milestones/api";
import { Card, ErrorNote, Spinner } from "../components/ui";

export function MilestonesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const milestones = useMilestones(projectId!);
  const ids = milestones.data?.map((m) => m.id) ?? [];
  const progressResults = useMilestoneProgressList(ids);

  const progressById = new Map(
    progressResults
      .map((r) => r.data)
      .filter((d): d is NonNullable<typeof d> => !!d)
      .map((d) => [d.milestoneId, d]),
  );

  if (milestones.isLoading) return <Spinner />;
  if (milestones.isError)
    return <ErrorNote message="Could not load milestones." />;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Milestones</h1>

      {milestones.data && milestones.data.length > 0 && (
        <Card className="mb-6 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-600">
            Timeline
          </h2>
          <Gantt milestones={milestones.data} />
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {milestones.data?.map((m) => (
          <MilestoneProgressCard
            key={m.id}
            milestone={m}
            progress={progressById.get(m.id)}
          />
        ))}
        {milestones.data?.length === 0 && (
          <p className="text-sm text-slate-500">No milestones yet.</p>
        )}
      </div>
    </div>
  );
}

// Lightweight horizontal gantt: bars positioned by start→target across the
// combined date range of all milestones.
function Gantt({ milestones }: { milestones: MilestoneDto[] }) {
  const dates = milestones.flatMap((m) => [
    new Date(m.startDate ?? m.createdAt).getTime(),
    new Date(m.targetDate).getTime(),
  ]);
  const min = Math.min(...dates);
  const max = Math.max(...dates);
  const span = Math.max(max - min, 1);

  return (
    <div className="flex flex-col gap-2">
      {milestones.map((m) => {
        const start = new Date(m.startDate ?? m.createdAt).getTime();
        const end = new Date(m.targetDate).getTime();
        const left = ((start - min) / span) * 100;
        const width = Math.max(((end - start) / span) * 100, 4);
        return (
          <div key={m.id} className="flex items-center gap-2">
            <span className="w-32 truncate text-xs text-slate-600">
              {m.name}
            </span>
            <div className="relative h-4 flex-1 rounded bg-slate-100">
              <div
                className="absolute h-4 rounded bg-blue-400"
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${m.name}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
