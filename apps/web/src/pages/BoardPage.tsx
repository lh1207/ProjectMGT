import { SprintStatus, type IssueStatus } from "@pmgt/shared";
import { useParams } from "react-router-dom";
import { BoardView } from "../features/scrum/BoardView";
import {
  useBoard,
  useMoveIssue,
  useSprintLifecycle,
  useSprints,
} from "../features/scrum/api";
import { Button, Card, ErrorNote, Spinner } from "../components/ui";

export function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = projectId!;
  const sprintsQuery = useSprints(pid);
  const move = useMoveIssue(pid);
  const { start, complete } = useSprintLifecycle(pid);

  const sprints = sprintsQuery.data ?? [];
  const activeSprint =
    sprints.find((s) => s.status === SprintStatus.ACTIVE) ??
    sprints.find((s) => s.status === SprintStatus.PLANNED);

  const board = useBoard(activeSprint?.id);

  if (sprintsQuery.isLoading) return <Spinner />;
  if (sprintsQuery.isError)
    return <ErrorNote message="Could not load sprints." />;

  if (!activeSprint) {
    return (
      <Card className="p-6">
        <p className="text-slate-600">
          No active sprint. Create and start one from the Backlog.
        </p>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{activeSprint.name}</h1>
          {activeSprint.goal && (
            <p className="text-sm text-slate-500">{activeSprint.goal}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-slate-200 px-2 py-1 text-xs font-medium">
            {activeSprint.status}
          </span>
          {activeSprint.status === SprintStatus.PLANNED && (
            <Button onClick={() => start.mutate(activeSprint.id)}>
              Start sprint
            </Button>
          )}
          {activeSprint.status === SprintStatus.ACTIVE && (
            <Button
              variant="ghost"
              onClick={() => complete.mutate(activeSprint.id)}
            >
              Complete sprint
            </Button>
          )}
        </div>
      </div>

      {board.isLoading && <Spinner label="Loading board…" />}
      {board.data && (
        <BoardView
          columns={board.data.columns}
          onMove={(issueId: string, status: IssueStatus) =>
            move.mutate({ id: issueId, status })
          }
        />
      )}
    </div>
  );
}
