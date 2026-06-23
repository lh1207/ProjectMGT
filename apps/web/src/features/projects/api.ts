import type { ProjectDto } from "@pmgt/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "../../lib/api";

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await http.get<ProjectDto[]>("/projects");
      return res.data;
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      key: string;
      name: string;
      description?: string;
    }) => {
      const res = await http.post<ProjectDto>("/projects", input);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}
