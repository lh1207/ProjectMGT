import { describe, expect, it } from "vitest";
import { IssueStatus } from "./enums";
import { canTransition } from "./state-machine";

describe("state machine", () => {
  it("allows the forward happy path", () => {
    expect(canTransition(IssueStatus.BACKLOG, IssueStatus.TODO)).toBe(true);
    expect(canTransition(IssueStatus.TODO, IssueStatus.IN_PROGRESS)).toBe(true);
    expect(canTransition(IssueStatus.IN_PROGRESS, IssueStatus.IN_REVIEW)).toBe(true);
    expect(canTransition(IssueStatus.IN_REVIEW, IssueStatus.DONE)).toBe(true);
  });

  it("allows pragmatic reverse moves", () => {
    expect(canTransition(IssueStatus.IN_REVIEW, IssueStatus.IN_PROGRESS)).toBe(true);
    expect(canTransition(IssueStatus.DONE, IssueStatus.IN_REVIEW)).toBe(true);
  });

  it("rejects illegal skips", () => {
    expect(canTransition(IssueStatus.BACKLOG, IssueStatus.DONE)).toBe(false);
    expect(canTransition(IssueStatus.TODO, IssueStatus.DONE)).toBe(false);
    expect(canTransition(IssueStatus.TODO, IssueStatus.IN_REVIEW)).toBe(false);
  });

  it("treats same-status as a legal no-op (reordering)", () => {
    expect(canTransition(IssueStatus.IN_PROGRESS, IssueStatus.IN_PROGRESS)).toBe(true);
  });
});
