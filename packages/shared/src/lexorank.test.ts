import { describe, expect, it } from "vitest";
import { initialRanks, rankBetween } from "./lexorank";

describe("lexorank", () => {
  it("produces strictly increasing initial ranks", () => {
    const ranks = initialRanks(10);
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i - 1]! < ranks[i]!).toBe(true);
    }
  });

  it("inserts strictly between two adjacent ranks", () => {
    const a = "i";
    const b = "j";
    const mid = rankBetween(a, b);
    expect(a < mid).toBe(true);
    expect(mid < b).toBe(true);
  });

  it("handles open lower bound", () => {
    const r = rankBetween(null, "i");
    expect(r < "i").toBe(true);
  });

  it("handles open upper bound", () => {
    const r = rankBetween("i", null);
    expect("i" < r).toBe(true);
  });

  it("supports repeated midpoint insertion without collision", () => {
    let lo = "a";
    let hi = "z";
    const seen = new Set<string>([lo, hi]);
    for (let i = 0; i < 50; i++) {
      const mid = rankBetween(lo, hi);
      expect(lo < mid && mid < hi).toBe(true);
      expect(seen.has(mid)).toBe(false);
      seen.add(mid);
      hi = mid;
    }
  });
});
