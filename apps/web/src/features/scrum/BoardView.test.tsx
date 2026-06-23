import { IssueStatus, type BoardColumnDto, type IssueDto } from "@pmgt/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BoardView } from "./BoardView";

function issue(partial: Partial<IssueDto> & { id: string; key: string }): IssueDto {
  return {
    projectId: "p1",
    sprintId: "s1",
    milestoneId: null,
    title: partial.title ?? "Issue",
    description: null,
    type: "TASK",
    status: partial.status ?? IssueStatus.TODO,
    priority: "MEDIUM",
    storyPoints: partial.storyPoints ?? null,
    boardRank: "i",
    assigneeId: null,
    reporterId: "u1",
    createdAt: new Date().toISOString(),
    closedAt: null,
    ...partial,
  };
}

const columns: BoardColumnDto[] = [
  {
    status: IssueStatus.TODO,
    issues: [issue({ id: "1", key: "P-1", title: "Todo item" })],
  },
  { status: IssueStatus.IN_PROGRESS, issues: [] },
  { status: IssueStatus.IN_REVIEW, issues: [] },
  {
    status: IssueStatus.DONE,
    issues: [
      issue({ id: "2", key: "P-2", title: "Done item", status: IssueStatus.DONE }),
    ],
  },
];

describe("BoardView", () => {
  it("renders all four board columns", () => {
    render(<BoardView columns={columns} onMove={vi.fn()} />);
    expect(screen.getByTestId(`column-${IssueStatus.TODO}`)).toBeInTheDocument();
    expect(
      screen.getByTestId(`column-${IssueStatus.IN_PROGRESS}`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`column-${IssueStatus.IN_REVIEW}`),
    ).toBeInTheDocument();
    expect(screen.getByTestId(`column-${IssueStatus.DONE}`)).toBeInTheDocument();
  });

  it("places issues in their status column", () => {
    render(<BoardView columns={columns} onMove={vi.fn()} />);
    const todo = screen.getByTestId(`column-${IssueStatus.TODO}`);
    const done = screen.getByTestId(`column-${IssueStatus.DONE}`);
    expect(todo).toHaveTextContent("Todo item");
    expect(todo).toHaveTextContent("P-1");
    expect(done).toHaveTextContent("Done item");
  });
});
