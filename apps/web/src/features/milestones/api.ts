import type { MilestoneDto, MilestoneProgressDto } from "@pmgt/shared";
import { useQueries, useQuery } from "@tanstack/react-query";
import { http } from "../../lib/api";

export function useMilestones(projectId: string) {
  return useQuery({
    queryKey: ["milestones", projectId],
    queryFn: async () => {
      const res = await http.get<MilestoneDto[]>(
        `/projects/${projectId}/milestones`,
      );
      return res.data;
    },
  });
}

// Fetch progress for many milestones at once; each entry is independently cached
// so a realtime milestone.progress event can refresh just the affected one.
export function useMilestoneProgressList(milestoneIds: string[]) {
  return useQueries({
    queries: milestoneIds.map((id) => ({
      queryKey: ["milestone-progress", id],
      queryFn: async () => {
        const res = await http.get<MilestoneProgressDto>(
          `/milestones/${id}/progress`,
        );
        return res.data;
      },
    })),
  });
}
