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
 * Dropbox / phone export filenames often look like:
 * `IMG_4413 Millicent Wibert.jpeg`, `20241226_113113_6181F8 Kurstin Shalawylo.mp4`, UUID + name, etc.
 * Pull out the trailing human name for matching.
 */
export function nameHintFromFilename(filename: string): string {
  const base = stripExtension(filename.replace(/^.*\//, ""));
  const parts = base.trim().split(/\s+/).filter(Boolean);
  const kept: string[] = [];
  for (const p of parts) {
    if (/^IMG_\d+$/i.test(p)) continue;
    if (/^\d{8}_/.test(p)) continue;
    if (
      /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(p)
    )
      continue;
    if (/^\(\d+\)$/.test(p)) continue;
    if (/^image\d*$/i.test(p)) continue;
    kept.push(p);
  }
  while (kept.length && /^\(\d+\)$/.test(kept[kept.length - 1]!)) {
    kept.pop();
  }
  if (kept.length >= 2) {
    return kept.slice(-2).join(" ");
  }
  return kept.join(" ");
}

function lastFirstAligned(hint: string, formName: string): number {
  const ha = hint.split(" ").filter((x) => x.length > 1);
  const fb = formName.split(" ").filter((x) => x.length > 1);
  if (ha.length < 2 || fb.length < 2) return 0;
  const hFirst = ha[0]!.toLowerCase();
  const hLast = ha[ha.length - 1]!.toLowerCase();
  const fFirst = fb[0]!.toLowerCase();
  const fLast = fb[fb.length - 1]!.toLowerCase();
  if (hLast !== fLast) return 0;
  if (hFirst === fFirst) return 100;
  const n = Math.min(hFirst.length, fFirst.length, 4);
  if (n >= 3 && hFirst.slice(0, 3) === fFirst.slice(0, 3)) return 78;
  if (hFirst.startsWith("mill") && fFirst.startsWith("mill")) return 80;
  return 0;
}

function substringScore(stem: string, name: string): number {
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

/**
 * Score how well `filename` matches `fullName` (form “First and Last Name”).
 */
export function scoreNameMatch(filename: string, fullName: string): number {
  const hint = normalizeNameKey(nameHintFromFilename(filename));
  const stem = normalizeNameKey(stripExtension(filename.replace(/^.*\//, "")));
  const name = normalizeNameKey(fullName);
  if (!name) return 0;
  const a = substringScore(hint, name);
  const b = substringScore(stem, name);
  const c = lastFirstAligned(hint, name);
  return Math.max(a, b, c);
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
