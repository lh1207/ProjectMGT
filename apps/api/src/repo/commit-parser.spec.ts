import { CommitRefAction } from "@pmgt/shared";
import { parseCommitMessage } from "./commit-parser";

describe("parseCommitMessage", () => {
  it("parses a verb + hash reference and expands with project key", () => {
    const refs = parseCommitMessage("Fixes #123 in the parser", "PMGT");
    expect(refs).toEqual([
      { action: CommitRefAction.FIXES, issueKey: "PMGT-123" },
    ]);
  });

  it("parses a full issue key reference", () => {
    const refs = parseCommitMessage("Closes PMGT-42", "PMGT");
    expect(refs).toEqual([
      { action: CommitRefAction.CLOSES, issueKey: "PMGT-42" },
    ]);
  });

  it("treats resolve/resolves as CLOSES", () => {
    expect(parseCommitMessage("resolved #7", "PMGT")[0]!.action).toBe(
      CommitRefAction.CLOSES,
    );
  });

  it("captures bare references as REFS", () => {
    const refs = parseCommitMessage("touch PMGT-9 lightly", "PMGT");
    expect(refs).toEqual([
      { action: CommitRefAction.REFS, issueKey: "PMGT-9" },
    ]);
  });

  it("verb match wins over a bare match for the same issue", () => {
    const refs = parseCommitMessage("Fixes #5, see also #5", "PMGT");
    expect(refs).toHaveLength(1);
    expect(refs[0]).toEqual({
      action: CommitRefAction.FIXES,
      issueKey: "PMGT-5",
    });
  });

  it("handles multiple distinct references", () => {
    const refs = parseCommitMessage("Fixes #1 and refs PMGT-2", "PMGT");
    expect(refs).toHaveLength(2);
    expect(refs.map((r) => r.issueKey).sort()).toEqual(["PMGT-1", "PMGT-2"]);
  });

  it("returns empty for messages with no references", () => {
    expect(parseCommitMessage("Just a tidy refactor", "PMGT")).toEqual([]);
  });

  it("is case-insensitive on the verb", () => {
    expect(parseCommitMessage("FIXED #3", "PMGT")[0]!.action).toBe(
      CommitRefAction.FIXES,
    );
  });
});
