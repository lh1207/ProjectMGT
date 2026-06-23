import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import "./index.css";
import { RequireAuth } from "./components/RequireAuth";
import { BacklogPage } from "./pages/BacklogPage";
import { BoardPage } from "./pages/BoardPage";
import { LoginPage } from "./pages/LoginPage";
import { MilestonesPage } from "./pages/MilestonesPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ReposPage } from "./pages/ReposPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: "/", element: <Navigate to="/projects" replace /> },
      { path: "/projects", element: <ProjectsPage /> },
      {
        path: "/projects/:projectId",
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="board" replace /> },
          { path: "board", element: <BoardPage /> },
          { path: "backlog", element: <BacklogPage /> },
          { path: "repos", element: <ReposPage /> },
          { path: "milestones", element: <MilestonesPage /> },
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
