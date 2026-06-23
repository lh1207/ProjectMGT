import { DomainEvent } from "@pmgt/shared";
import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "./auth-store";

let socket: Socket | null = null;

function getSocket(token: string): Socket {
  if (!socket) {
    socket = io("/", {
      transports: ["websocket"],
      autoConnect: false,
      auth: { token },
    });
  } else {
    socket.auth = { token };
  }
  return socket;
}

// Subscribes to a project's realtime room and invalidates the relevant query
// caches when domain events arrive, so views refresh without manual polling.
export function useProjectRealtime(projectId: string | undefined): void {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!projectId || !accessToken) return;
    const s = getSocket(accessToken);
    if (!s.connected) {
      s.connect();
    }

    const join = () => s.emit("join", { projectId });
    if (s.connected) join();
    s.on("connect", join);

    const invalidateBoard = () => {
      void queryClient.invalidateQueries({ queryKey: ["issues", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["board"] });
      void queryClient.invalidateQueries({ queryKey: ["sprints", projectId] });
    };
    const invalidateRepo = () => {
      void queryClient.invalidateQueries({ queryKey: ["commits"] });
      void queryClient.invalidateQueries({ queryKey: ["pulls"] });
      invalidateBoard();
    };
    const invalidateMilestones = () => {
      void queryClient.invalidateQueries({
        queryKey: ["milestones", projectId],
      });
      void queryClient.invalidateQueries({ queryKey: ["milestone-progress"] });
    };

    s.on(DomainEvent.IssueUpdated, invalidateBoard);
    s.on(DomainEvent.SprintUpdated, invalidateBoard);
    s.on(DomainEvent.CommitCreated, invalidateRepo);
    s.on(DomainEvent.PrOpened, invalidateRepo);
    s.on(DomainEvent.PrMerged, () => {
      invalidateRepo();
      invalidateMilestones();
    });
    s.on(DomainEvent.PrClosed, invalidateRepo);
    s.on(DomainEvent.MilestoneProgress, invalidateMilestones);

    return () => {
      s.off("connect", join);
      s.off(DomainEvent.IssueUpdated, invalidateBoard);
      s.off(DomainEvent.SprintUpdated, invalidateBoard);
      s.off(DomainEvent.CommitCreated, invalidateRepo);
      s.off(DomainEvent.PrOpened, invalidateRepo);
      s.off(DomainEvent.PrMerged);
      s.off(DomainEvent.PrClosed, invalidateRepo);
      s.off(DomainEvent.MilestoneProgress, invalidateMilestones);
    };
  }, [projectId, accessToken, queryClient]);
}
