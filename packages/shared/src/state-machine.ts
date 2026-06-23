import { IssueStatus } from "./enums";

// Kanban state machine. Forward flow plus pragmatic reverse moves (e.g. kicking a
// reviewed item back to IN_PROGRESS). A move is legal iff `to` is in the from-set.
// Any status may move back to BACKLOG (de-scoping) and out of BACKLOG to TODO.
export const ALLOWED_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  [IssueStatus.BACKLOG]: [IssueStatus.TODO],
  [IssueStatus.TODO]: [IssueStatus.BACKLOG, IssueStatus.IN_PROGRESS],
  [IssueStatus.IN_PROGRESS]: [IssueStatus.TODO, IssueStatus.IN_REVIEW, IssueStatus.BACKLOG],
  [IssueStatus.IN_REVIEW]: [IssueStatus.IN_PROGRESS, IssueStatus.DONE, IssueStatus.BACKLOG],
  [IssueStatus.DONE]: [IssueStatus.IN_REVIEW, IssueStatus.BACKLOG],
};

export function canTransition(from: IssueStatus, to: IssueStatus): boolean {
  if (from === to) return true; // no-op (used for pure reordering within a column)
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

// Direct jump used by automation (e.g. PR merge → DONE). Bypasses the step-by-step
// rule but is still a defined, auditable transition target.
export function isTerminal(status: IssueStatus): boolean {
  return status === IssueStatus.DONE;
}
