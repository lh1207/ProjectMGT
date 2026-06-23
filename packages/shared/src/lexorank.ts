// Minimal lexicographic fractional ranking. Ranks are base-36 strings compared
// lexicographically; inserting between two ranks finds a midpoint string without
// rewriting siblings. Good enough for board/backlog ordering at app scale.

const MIN_CHAR = 0; // '0'
const MAX_CHAR = 35; // 'z'
const BASE = 36;

function toVal(c: string): number {
  return parseInt(c, 36);
}
function toChar(v: number): string {
  return v.toString(36);
}

// Returns a rank strictly between `before` and `after`. Pass null for an open end.
export function rankBetween(before: string | null, after: string | null): string {
  const a = before ?? "";
  const b = after ?? "";

  let result = "";
  let i = 0;
  while (true) {
    const lo = i < a.length ? toVal(a[i]!) : MIN_CHAR;
    const hi = i < b.length && b !== "" ? toVal(b[i]!) : MAX_CHAR + 1;

    if (lo === hi) {
      result += toChar(lo);
      i++;
      continue;
    }
    const mid = Math.floor((lo + hi) / 2);
    if (mid === lo) {
      // No integer gap at this position; descend using `before`'s digit then continue.
      result += toChar(lo);
      i++;
      continue;
    }
    result += toChar(mid);
    return result;
  }
}

// Evenly spaced initial ranks for `count` items.
export function initialRanks(count: number): string[] {
  const ranks: string[] = [];
  let prev: string | null = null;
  for (let i = 0; i < count; i++) {
    const r = rankBetween(prev, null);
    ranks.push(r);
    prev = r;
  }
  return ranks;
}
