import type {
  BoardDto,
  IssueDto,
  IssueStatus,
  SprintDto,
  VelocityDto,
} from "@pmgt/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "../../lib/api";

export function useIssues(projectId: string) {
  return useQuery({
    queryKey: ["issues", projectId],
    queryFn: async () => {
      const res = await http.get<IssueDto[]>(`/projects/${projectId}/issues`);
      return res.data;
    },
  });
}

export function useSprints(projectId: string) {
  return useQuery({
    queryKey: ["sprints", projectId],
    queryFn: async () => {
      const res = await http.get<SprintDto[]>(`/projects/${projectId}/sprints`);
      return res.data;
    },
  });
}

export function useBoard(sprintId: string | undefined) {
  return useQuery({
    queryKey: ["board", sprintId],
    enabled: !!sprintId,
    queryFn: async () => {
      const res = await http.get<BoardDto>(`/sprints/${sprintId}/board`);
      return res.data;
    },
  });
}

export function useVelocity(projectId: string) {
  return useQuery({
    queryKey: ["velocity", projectId],
    queryFn: async () => {
      const res = await http.get<VelocityDto>(
        `/projects/${projectId}/velocity`,
      );
      return res.data;
    },
  });
}

export function useCreateIssue(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      storyPoints?: number;
      sprintId?: string;
      type?: string;
    }) => {
      const res = await http.post<IssueDto>(
        `/projects/${projectId}/issues`,
        input,
      );
      return res.data;
    },
    onSuccess: () => invalidateScrum(qc, projectId),
  });
}

export function useMoveIssue(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      status: IssueStatus;
      beforeId?: string;
      afterId?: string;
    }) => {
      const { id, ...body } = input;
      const res = await http.patch<IssueDto>(`/issues/${id}/move`, body);
      return res.data;
    },
    onSuccess: () => invalidateScrum(qc, projectId),
  });
}

export function useCreateSprint(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; goal?: string }) => {
      const res = await http.post<SprintDto>(
        `/projects/${projectId}/sprints`,
        input,
      );
      return res.data;
    },
    onSuccess: () => invalidateScrum(qc, projectId),
  });
}

export function useSprintLifecycle(projectId: string) {
  const qc = useQueryClient();
  const start = useMutation({
    mutationFn: async (sprintId: string) =>
      (await http.post(`/sprints/${sprintId}/start`)).data,
    onSuccess: () => invalidateScrum(qc, projectId),
  });
  const complete = useMutation({
    mutationFn: async (sprintId: string) =>
      (await http.post(`/sprints/${sprintId}/complete`, {})).data,
    onSuccess: () => invalidateScrum(qc, projectId),
  });
  return { start, complete };
}

function invalidateScrum(
  qc: ReturnType<typeof useQueryClient>,
  projectId: string,
): void {
  void qc.invalidateQueries({ queryKey: ["issues", projectId] });
  void qc.invalidateQueries({ queryKey: ["sprints", projectId] });
  void qc.invalidateQueries({ queryKey: ["board"] });
  void qc.invalidateQueries({ queryKey: ["velocity", projectId] });
}
