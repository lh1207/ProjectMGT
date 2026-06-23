import { computeVelocity } from "./velocity.util";

describe("computeVelocity", () => {
  const mk = (id: string, committed: number, completed: number) => ({
    sprintId: id,
    sprintName: id,
    committedPoints: committed,
    completedPoints: completed,
  });

  it("returns zero for no completed sprints", () => {
    expect(computeVelocity([], 3)).toEqual({ averageVelocity: 0, sprints: [] });
  });

  it("averages completed points over the window", () => {
    const result = computeVelocity(
      [mk("s1", 10, 8), mk("s2", 10, 12), mk("s3", 10, 10)],
      3,
    );
    expect(result.averageVelocity).toBe(10);
    expect(result.sprints).toHaveLength(3);
  });

  it("only considers the most recent lastN sprints", () => {
    const result = computeVelocity(
      [mk("s1", 10, 2), mk("s2", 10, 10), mk("s3", 10, 14)],
      2,
    );
    // window = s2, s3 → (10 + 14) / 2 = 12
    expect(result.averageVelocity).toBe(12);
    expect(result.sprints.map((s) => s.sprintId)).toEqual(["s2", "s3"]);
  });

  it("rounds to one decimal place", () => {
    const result = computeVelocity([mk("s1", 5, 5), mk("s2", 5, 8)], 3);
    // (5 + 8) / 2 = 6.5
    expect(result.averageVelocity).toBe(6.5);
  });
});
