import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../lib/auth-store";
import { useProjectRealtime } from "../lib/socket";
import { Button } from "./ui";

const NAV = [
  { to: "board", label: "Board" },
  { to: "backlog", label: "Backlog" },
  { to: "repos", label: "Repos" },
  { to: "milestones", label: "Milestones" },
];

// Project workspace layout: sidebar nav + topbar, with the realtime subscription
// scoped to the active project.
export function AppShell() {
  const { projectId } = useParams<{ projectId: string }>();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();
  useProjectRealtime(projectId);

  return (
    <div className="flex h-full">
      <aside className="flex w-52 flex-col border-r border-slate-200 bg-white">
        <div className="px-4 py-4 text-lg font-bold text-blue-700">
          ProjectMGT
        </div>
        <nav className="flex flex-col gap-1 px-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto px-2 pb-4">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => navigate("/projects")}
          >
            ← All projects
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="text-sm text-slate-500">
            Project workspace
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{user?.name}</span>
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
        </header>
        <main className="min-h-0 flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
