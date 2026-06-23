import { IssueStatus } from "@pmgt/shared";
import { computeProgress, type StatusGroup } from "./progress.util";

const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
const past = new Date(Date.now() - 24 * 60 * 60 * 1000);

describe("computeProgress", () => {
  it("returns zeros for an empty milestone", () => {
    const r = computeProgress("m1", [], future);
    expect(r.total).toBe(0);
    expect(r.percent).toBe(0);
    expect(r.atRisk).toBe(false);
  });

  it("computes percent from done/total", () => {
    const groups: StatusGroup[] = [
      { status: IssueStatus.DONE, count: 3, points: 9 },
      { status: IssueStatus.TODO, count: 1, points: 2 },
    ];
    const r = computeProgress("m1", groups, future);
    expect(r.total).toBe(4);
    expect(r.done).toBe(3);
    expect(r.percent).toBe(75);
    expect(r.points).toEqual({ committed: 11, done: 9 });
    expect(r.byStatus[IssueStatus.DONE]).toBe(3);
  });

  it("flags at-risk when overdue and incomplete", () => {
    const groups: StatusGroup[] = [
      { status: IssueStatus.DONE, count: 1, points: 1 },
      { status: IssueStatus.IN_PROGRESS, count: 1, points: 3 },
    ];
    expect(computeProgress("m1", groups, past).atRisk).toBe(true);
  });

  it("is not at-risk when complete even if overdue", () => {
    const groups: StatusGroup[] = [
      { status: IssueStatus.DONE, count: 2, points: 5 },
    ];
    expect(computeProgress("m1", groups, past).atRisk).toBe(false);
  });

  it("is not at-risk with a comfortable future deadline", () => {
    const groups: StatusGroup[] = [
      { status: IssueStatus.DONE, count: 1, points: 1 },
      { status: IssueStatus.TODO, count: 9, points: 9 },
    ];
    expect(computeProgress("m1", groups, future).atRisk).toBe(false);
  });
});
