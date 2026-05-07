/** Normalize for fuzzy comparison of display names and filenames. */
export function normalizeNameKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[.,'’`]/g, "")
    .replace(/\s+/g, " ");
}

function stripExtension(filename: string): string {
  const base = filename.replace(/^.*\//, "");
  return base.replace(/\.[^.]+$/, "");
}

/**
 * Score how well `filenameStem` matches `fullName`.
 * Returns 0–100; treat >= 55 as a plausible match.
 */
export function scoreNameMatch(filename: string, fullName: string): number {
  const stem = normalizeNameKey(stripExtension(filename));
  const name = normalizeNameKey(fullName);
  if (!stem || !name) return 0;
  if (stem === name) return 100;
  if (stem.includes(name) || name.includes(stem)) return 82;
  const parts = name.split(" ").filter((p) => p.length > 1);
  if (parts.length === 0) return 0;
  const hits = parts.filter((p) => stem.includes(p));
  if (parts.length >= 2 && hits.length >= 2) return 72;
  if (hits.length === parts.length) return 65;
  if (hits.length >= 1 && parts.length === 1) return 58;
  if (parts.length >= 2 && hits.length === 1) {
    const [first] = parts;
    if (first && stem.startsWith(first)) return 56;
  }
  return 0;
}

export type ScoredPerson = {
  key: string;
  displayName: string;
};

export function pickBestPersonMatch(
  filename: string,
  people: ScoredPerson[],
  minScore = 55,
): { person: ScoredPerson; score: number } | null {
  let best: { person: ScoredPerson; score: number } | null = null;
  for (const person of people) {
    const score = scoreNameMatch(filename, person.displayName);
    if (score >= minScore && (!best || score > best.score)) {
      best = { person, score };
    }
  }
  return best;
}
