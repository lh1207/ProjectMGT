import { PullRequestStatus } from "@pmgt/shared";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  useCommits,
  useCreateRepo,
  useMergePull,
  usePulls,
  useRepos,
} from "../features/repos/api";
import { Button, Card, Input, Spinner } from "../components/ui";

export function ReposPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = projectId!;
  const repos = useRepos(pid);
  const createRepo = useCreateRepo(pid);
  const [selected, setSelected] = useState<string | undefined>();
  const [name, setName] = useState("");

  useEffect(() => {
    if (!selected && repos.data?.length) {
      setSelected(repos.data[0]!.id);
    }
  }, [repos.data, selected]);

  const commits = useCommits(selected);
  const pulls = usePulls(selected);
  const merge = useMergePull(selected ?? "");

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Repositories</h1>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const slug = name.toLowerCase().replace(/[^a-z0-9-_]/g, "-");
            createRepo.mutate({ name, slug });
            setName("");
          }}
        >
          <Input
            placeholder="New repo name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Button type="submit">Add repo</Button>
        </form>
      </div>

      {repos.isLoading ? (
        <Spinner />
      ) : (
        <div className="mb-4 flex flex-wrap gap-2">
          {repos.data?.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r.id)}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                selected === r.id
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-300 bg-white"
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 font-semibold">Commits</h2>
          <div className="flex flex-col gap-2">
            {commits.data?.map((c) => (
              <Card key={c.id} className="p-3">
                <div className="flex items-center justify-between">
                  <code className="text-xs text-slate-400">
                    {c.sha.slice(0, 7)}
                  </code>
                  <span className="text-xs text-slate-500">
                    {c.authorName}
                  </span>
                </div>
                <p className="mt-1 text-sm">{c.message}</p>
                {c.linkedIssueIds.length > 0 && (
                  <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 text-xs text-amber-700">
                    links {c.linkedIssueIds.length} issue(s)
                  </span>
                )}
              </Card>
            ))}
            {commits.data?.length === 0 && (
              <p className="text-sm text-slate-500">No commits yet.</p>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-2 font-semibold">Pull Requests</h2>
          <div className="flex flex-col gap-2">
            {pulls.data?.map((pr) => (
              <Card key={pr.id} className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    #{pr.number} {pr.title}
                  </span>
                  <span
                    className={`rounded px-1.5 text-xs ${
                      pr.status === PullRequestStatus.MERGED
                        ? "bg-green-100 text-green-700"
                        : pr.status === PullRequestStatus.CLOSED
                          ? "bg-slate-200 text-slate-600"
                          : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {pr.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {pr.sourceBranch} → {pr.targetBranch} · links{" "}
                  {pr.linkedIssueIds.length} issue(s)
                </p>
                {pr.status === PullRequestStatus.OPEN && (
                  <Button
                    className="mt-2"
                    onClick={() => merge.mutate(pr.id)}
                    disabled={merge.isPending}
                  >
                    Merge
                  </Button>
                )}
              </Card>
            ))}
            {pulls.data?.length === 0 && (
              <p className="text-sm text-slate-500">No pull requests yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
