import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { groupSubmissionsByPerson, parseFormSheetCsv } from "./sheet";
import { pickBestPersonMatch, type ScoredPerson } from "./nameMatch";

export type MemoryMedia = {
  id: string;
  fileName: string;
  url: string;
  kind: "image" | "video";
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
  items: MemoryMedia[];
  storiesWithoutMedia: MemoryStory[];
};

const MEDIA_RE = /\.(jpe?g|png|gif|webp|heic|avif|bmp|tif?f|mp4|mov|webm)$/i;
const VIDEO_RE = /\.(mp4|mov|webm)$/i;

const CSV_PATH = join(process.cwd(), "data", "memories", "submissions.csv");
const MEMORIES_PUBLIC_DIR = join(process.cwd(), "public", "memories");

async function listMemoryMedia(): Promise<
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
      } else if (e.isFile() && MEDIA_RE.test(e.name)) {
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

export async function buildMemories(): Promise<MemoriesPayload> {
  let csvText: string;
  try {
    csvText = await readFile(CSV_PATH, "utf8");
  } catch {
    throw new Error("Missing data/memories/submissions.csv.");
  }

  const rows = parseFormSheetCsv(csvText);
  const people = groupSubmissionsByPerson(rows);

  const scoredPeople: ScoredPerson[] = people.map((p) => ({
    key: p.key,
    displayName: p.displayName,
  }));

  const files = await listMemoryMedia();
  const items: MemoryMedia[] = [];

  for (const { relPath, baseName } of files) {
    const match = pickBestPersonMatch(baseName, scoredPeople, 55);
    const group = match
      ? people.find((p) => p.key === match.person.key)
      : undefined;

    items.push({
      id: relPath,
      fileName: relPath,
      url: publicUrlForMemory(relPath),
      kind: VIDEO_RE.test(baseName) ? "video" : "image",
      matchedName: match ? group?.displayName ?? match.person.displayName : null,
      matchScore: match?.score ?? null,
      submissions: group?.submissions ?? [],
    });
  }

  const mediaMatchedKeys = new Set<string>();
  for (const item of items) {
    for (const s of item.submissions) {
      mediaMatchedKeys.add(s.nameKey);
    }
  }

  const storiesWithoutMedia: MemoryStory[] = people
    .filter((g) => !mediaMatchedKeys.has(g.key))
    .map((g) => ({
      displayName: g.displayName,
      nameKey: g.key,
      submissions: g.submissions,
      hasPhoto: false,
    }));

  return {
    generatedAt: new Date().toISOString(),
    items: items.sort((a, b) => {
      const an = a.matchedName ?? a.fileName;
      const bn = b.matchedName ?? b.fileName;
      const c = an.localeCompare(bn);
      if (c !== 0) return c;
      return a.fileName.localeCompare(b.fileName);
    }),
    storiesWithoutMedia,
  };
}

/** @deprecated use MemoryMedia */
export type MemoryPhoto = MemoryMedia;
