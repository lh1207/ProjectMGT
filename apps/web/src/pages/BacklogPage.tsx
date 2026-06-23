import { IssueStatus } from "@pmgt/shared";
import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  useCreateIssue,
  useCreateSprint,
  useIssues,
  useSprints,
  useVelocity,
} from "../features/scrum/api";
import { Button, Card, Input, Spinner } from "../components/ui";

export function BacklogPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = projectId!;
  const issues = useIssues(pid);
  const sprints = useSprints(pid);
  const velocity = useVelocity(pid);
  const createIssue = useCreateIssue(pid);
  const createSprint = useCreateSprint(pid);

  const [title, setTitle] = useState("");
  const [points, setPoints] = useState("");
  const [sprintName, setSprintName] = useState("");

  const backlog =
    issues.data?.filter((i) => i.status === IssueStatus.BACKLOG) ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h1 className="mb-3 text-xl font-bold">Backlog</h1>
        <Card className="mb-4 p-4">
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              createIssue.mutate({
                title,
                storyPoints: points ? Number(points) : undefined,
              });
              setTitle("");
              setPoints("");
            }}
          >
            <Input
              className="flex-1"
              placeholder="New issue title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Input
              className="w-20"
              type="number"
              min={0}
              placeholder="pts"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
            />
            <Button type="submit" disabled={createIssue.isPending}>
              Add
            </Button>
          </form>
        </Card>

        {issues.isLoading ? (
          <Spinner />
        ) : (
          <div className="flex flex-col gap-2">
            {backlog.map((i) => (
              <Card
                key={i.id}
                className="flex items-center justify-between p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">
                    {i.key}
                  </span>
                  <span className="text-sm">{i.title}</span>
                </div>
                {i.storyPoints != null && (
                  <span className="rounded bg-slate-100 px-1.5 text-xs text-slate-600">
                    {i.storyPoints} pts
                  </span>
                )}
              </Card>
            ))}
            {backlog.length === 0 && (
              <p className="text-sm text-slate-500">Backlog is empty.</p>
            )}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Sprints</h2>
        <Card className="mb-4 p-4">
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              createSprint.mutate({ name: sprintName });
              setSprintName("");
            }}
          >
            <Input
              placeholder="Sprint name"
              value={sprintName}
              onChange={(e) => setSprintName(e.target.value)}
              required
            />
            <Button type="submit">Add</Button>
          </form>
        </Card>
        <div className="flex flex-col gap-2">
          {sprints.data?.map((s) => (
            <Card key={s.id} className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{s.name}</span>
                <span className="rounded bg-slate-200 px-2 text-xs">
                  {s.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {s.completedPoints}/{s.committedPoints} pts
              </p>
            </Card>
          ))}
        </div>

        <h2 className="mb-2 mt-6 text-lg font-semibold">Velocity</h2>
        <Card className="p-4">
          <p className="text-2xl font-bold text-blue-700">
            {velocity.data?.averageVelocity ?? 0}
          </p>
          <p className="text-xs text-slate-500">
            avg points / last {velocity.data?.sprints.length ?? 0} sprints
          </p>
        </Card>
      </div>
    </div>
  );
}
