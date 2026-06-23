import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateProject, useProjects } from "../features/projects/api";
import { useAuthStore } from "../lib/auth-store";
import {
  Button,
  Card,
  ErrorNote,
  Input,
  Spinner,
} from "../components/ui";

export function ProjectsPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useProjects();
  const create = useCreateProject();
  const clear = useAuthStore((s) => s.clear);
  const [key, setKey] = useState("");
  const [name, setName] = useState("");

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const project = await create.mutateAsync({ key, name });
    navigate(`/projects/${project.id}/board`);
  };

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Button
          variant="ghost"
          onClick={() => {
            clear();
            navigate("/login");
          }}
        >
          Sign out
        </Button>
      </div>

      {isLoading && <Spinner />}
      {isError && <ErrorNote message="Could not load projects." />}

      <div className="grid gap-3 sm:grid-cols-2">
        {data?.map((p) => (
          <Card
            key={p.id}
            className="cursor-pointer p-4 hover:border-blue-400"
            onClick={() => navigate(`/projects/${p.id}/board`)}
          >
            <div className="flex items-center gap-2">
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-bold text-blue-700">
                {p.key}
              </span>
              <span className="font-medium">{p.name}</span>
            </div>
            {p.description && (
              <p className="mt-2 text-sm text-slate-500">{p.description}</p>
            )}
          </Card>
        ))}
      </div>

      <Card className="mt-8 p-4">
        <h2 className="mb-3 font-semibold">New project</h2>
        <form className="flex flex-wrap items-center gap-2" onSubmit={onCreate}>
          <Input
            className="w-28"
            placeholder="KEY"
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            required
          />
          <Input
            className="flex-1"
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Button type="submit" disabled={create.isPending}>
            Create
          </Button>
        </form>
        {create.isError && (
          <div className="mt-2">
            <ErrorNote message="Could not create project (key may be taken)." />
          </div>
        )}
      </Card>
    </div>
  );
}
