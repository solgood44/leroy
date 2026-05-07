import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { groupSubmissionsByPerson, parseFormSheetCsv } from "./sheet";
import { pickBestPersonMatch, type ScoredPerson } from "./nameMatch";

export type MemoryPhoto = {
  id: string;
  fileName: string;
  imageUrl: string;
  matchedName: string | null;
  matchScore: number | null;
  submissions: import("./sheet").SheetSubmission[];
};

export type MemoryStory = {
  displayName: string;
  nameKey: string;
  submissions: import("./sheet").SheetSubmission[];
  hasPhoto: boolean;
};

export type MemoriesPayload = {
  generatedAt: string;
  photos: MemoryPhoto[];
  storiesWithoutPhoto: MemoryStory[];
};

const IMAGE_RE = /\.(jpe?g|png|gif|webp|heic|avif|bmp|tif?f)$/i;

const CSV_PATH = join(process.cwd(), "data", "memories", "submissions.csv");
const MEMORIES_PUBLIC_DIR = join(process.cwd(), "public", "memories");

async function listMemoryImages(): Promise<
  { relPath: string; baseName: string }[]
> {
  async function walk(
    dir: string,
    prefix: string,
  ): Promise<{ relPath: string; baseName: string }[]> {
    const out: { relPath: string; baseName: string }[] = [];
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return out;
    }
    for (const e of entries) {
      if (e.name.startsWith(".")) continue;
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        out.push(...(await walk(full, rel)));
      } else if (e.isFile() && IMAGE_RE.test(e.name)) {
        out.push({ relPath: rel, baseName: e.name });
      }
    }
    return out;
  }
  return walk(MEMORIES_PUBLIC_DIR, "");
}

function publicUrlForMemory(relPath: string): string {
  return `/memories/${relPath.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * Build gallery payload from committed files:
 * - `data/memories/submissions.csv` (form responses)
 * - `public/memories/**` (images)
 */
export async function buildMemories(): Promise<MemoriesPayload> {
  let csvText: string;
  try {
    csvText = await readFile(CSV_PATH, "utf8");
  } catch {
    throw new Error(
      "Missing data/memories/submissions.csv. Run: npm run sync:memories",
    );
  }

  const rows = parseFormSheetCsv(csvText);
  const people = groupSubmissionsByPerson(rows);

  const scoredPeople: ScoredPerson[] = people.map((p) => ({
    key: p.key,
    displayName: p.displayName,
  }));

  const imageFiles = await listMemoryImages();
  const photos: MemoryPhoto[] = [];

  for (const { relPath, baseName } of imageFiles) {
    const match = pickBestPersonMatch(baseName, scoredPeople, 55);
    const group = match
      ? people.find((p) => p.key === match.person.key)
      : undefined;

    photos.push({
      id: relPath,
      fileName: relPath,
      imageUrl: publicUrlForMemory(relPath),
      matchedName: match ? group?.displayName ?? match.person.displayName : null,
      matchScore: match?.score ?? null,
      submissions: group?.submissions ?? [],
    });
  }

  const photoMatchedKeys = new Set<string>();
  for (const p of photos) {
    for (const s of p.submissions) {
      photoMatchedKeys.add(s.nameKey);
    }
  }

  const storiesWithoutPhoto: MemoryStory[] = people
    .filter((g) => !photoMatchedKeys.has(g.key))
    .map((g) => ({
      displayName: g.displayName,
      nameKey: g.key,
      submissions: g.submissions,
      hasPhoto: false,
    }));

  return {
    generatedAt: new Date().toISOString(),
    photos: photos.sort((a, b) => {
      const an = a.matchedName ?? a.fileName;
      const bn = b.matchedName ?? b.fileName;
      return an.localeCompare(bn);
    }),
    storiesWithoutPhoto,
  };
}
