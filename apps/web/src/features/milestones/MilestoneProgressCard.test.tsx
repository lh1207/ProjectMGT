import type { MilestoneDto, MilestoneProgressDto } from "@pmgt/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MilestoneProgressCard } from "./MilestoneProgressCard";

const milestone: MilestoneDto = {
  id: "m1",
  projectId: "p1",
  name: "v1.0 Launch",
  description: null,
  status: "ACTIVE",
  startDate: null,
  targetDate: new Date("2026-12-01").toISOString(),
  createdAt: new Date("2026-06-01").toISOString(),
  sprintIds: [],
};

function progress(
  partial: Partial<MilestoneProgressDto>,
): MilestoneProgressDto {
  return {
    milestoneId: "m1",
    total: 4,
    done: 3,
    percent: 75,
    points: { committed: 11, done: 9 },
    byStatus: {
      BACKLOG: 0,
      TODO: 1,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      DONE: 3,
    },
    atRisk: false,
    ...partial,
  };
}

describe("MilestoneProgressCard", () => {
  it("renders the percent and point totals", () => {
    render(
      <MilestoneProgressCard milestone={milestone} progress={progress({})} />,
    );
    expect(screen.getByText("75% complete")).toBeInTheDocument();
    expect(screen.getByText(/3\/4 issues/)).toBeInTheDocument();
    expect(screen.getByTestId("progress-bar")).toHaveStyle({ width: "75%" });
  });

  it("shows the at-risk badge when at risk", () => {
    render(
      <MilestoneProgressCard
        milestone={milestone}
        progress={progress({ atRisk: true, percent: 40, done: 1 })}
      />,
    );
    expect(screen.getByTestId("at-risk")).toBeInTheDocument();
  });

  it("renders safely without progress data", () => {
    render(<MilestoneProgressCard milestone={milestone} />);
    expect(screen.getByText("0% complete")).toBeInTheDocument();
  });
});
