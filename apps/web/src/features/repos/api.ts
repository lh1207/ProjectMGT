import type {
  CommitDto,
  PullRequestDto,
  RepositoryDto,
} from "@pmgt/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "../../lib/api";

export function useRepos(projectId: string) {
  return useQuery({
    queryKey: ["repos", projectId],
    queryFn: async () => {
      const res = await http.get<RepositoryDto[]>(
        `/projects/${projectId}/repos`,
      );
      return res.data;
    },
  });
}

export function useCommits(repoId: string | undefined) {
  return useQuery({
    queryKey: ["commits", repoId],
    enabled: !!repoId,
    queryFn: async () => {
      const res = await http.get<CommitDto[]>(`/repos/${repoId}/commits`);
      return res.data;
    },
  });
}

export function usePulls(repoId: string | undefined) {
  return useQuery({
    queryKey: ["pulls", repoId],
    enabled: !!repoId,
    queryFn: async () => {
      const res = await http.get<PullRequestDto[]>(`/repos/${repoId}/pulls`);
      return res.data;
    },
  });
}

export function useCreateRepo(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; slug: string }) => {
      const res = await http.post<RepositoryDto>(
        `/projects/${projectId}/repos`,
        input,
      );
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["repos", projectId] }),
  });
}

export function useMergePull(repoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prId: string) => {
      const res = await http.post<PullRequestDto>(`/pulls/${prId}/merge`);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["pulls", repoId] });
      void qc.invalidateQueries({ queryKey: ["commits", repoId] });
      void qc.invalidateQueries({ queryKey: ["board"] });
    },
  });
}
