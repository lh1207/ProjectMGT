import { CommitRefAction } from "@pmgt/shared";

export interface ParsedRef {
  action: CommitRefAction;
  issueKey: string; // normalized, e.g. "PMGT-12"
}

const ACTION_BY_VERB: Record<string, CommitRefAction> = {
  close: CommitRefAction.CLOSES,
  closes: CommitRefAction.CLOSES,
  closed: CommitRefAction.CLOSES,
  fix: CommitRefAction.FIXES,
  fixes: CommitRefAction.FIXES,
  fixed: CommitRefAction.FIXES,
  resolve: CommitRefAction.CLOSES,
  resolves: CommitRefAction.CLOSES,
  resolved: CommitRefAction.CLOSES,
  ref: CommitRefAction.REFS,
  refs: CommitRefAction.REFS,
  references: CommitRefAction.REFS,
};

// Matches "<verb> #123", "<verb> PMGT-12", or a bare "PMGT-12" / "#123" reference.
// Verb forms imply CLOSES/FIXES; a bare reference is a plain REFS link.
// `#<digits>` is expanded against the repository's project key.
const VERB_PATTERN = new RegExp(
  `\\b(${Object.keys(ACTION_BY_VERB).join("|")})\\b\\s+(?:#(\\d+)|([A-Z][A-Z0-9]+-\\d+))`,
  "gi",
);
const BARE_PATTERN = /(?:^|\s)(?:#(\d+)|([A-Z][A-Z0-9]+-\d+))/g;

export function parseCommitMessage(
  message: string,
  projectKey: string,
): ParsedRef[] {
  const refs = new Map<string, ParsedRef>();

  const expand = (hashNum?: string, fullKey?: string): string | null => {
    if (fullKey) return fullKey.toUpperCase();
    if (hashNum) return `${projectKey.toUpperCase()}-${hashNum}`;
    return null;
  };

  // First pass: verb-qualified references (highest precedence).
  for (const m of message.matchAll(VERB_PATTERN)) {
    const verb = m[1]!.toLowerCase();
    const action = ACTION_BY_VERB[verb] ?? CommitRefAction.REFS;
    const key = expand(m[2], m[3]);
    if (key) refs.set(key, { action, issueKey: key });
  }

  // Second pass: bare references default to REFS, without overriding a verb match.
  for (const m of message.matchAll(BARE_PATTERN)) {
    const key = expand(m[1], m[2]);
    if (key && !refs.has(key)) {
      refs.set(key, { action: CommitRefAction.REFS, issueKey: key });
    }
  }

  return [...refs.values()];
}
