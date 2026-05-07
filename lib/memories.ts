import { readdir, readFile } from "fs/promises";
import { join } from "path";
import {
  displayNameFromFilename,
  normalizeNameKey,
  pickBestPersonMatch,
  type ScoredPerson,
} from "./nameMatch";
import { groupSubmissionsByPerson, parseFormSheetCsv } from "./sheet";

/** One image or video file (no form text — that lives on the person album). */
export type MemoryFile = {
  id: string;
  fileName: string;
  url: string;
  kind: "image" | "video";
};

/** Grouped media: form submissions and/or name parsed from filenames. */
export type PersonAlbum = {
  nameKey: string;
  /** e.g. "Millie Wibert" or "Photos from Kirk Riley" */
  displayName: string;
  submissions: import("./sheet").SheetSubmission[];
  media: MemoryFile[];
  /** True when there was no Google Form row—label comes from Dropbox filename only */
  fromFilenameOnly?: boolean;
};

export type MemoryStory = {
  displayName: string;
  nameKey: string;
  submissions: import("./sheet").SheetSubmission[];
  hasPhoto: boolean;
};

export type MemoriesPayload = {
  generatedAt: string;
  albums: PersonAlbum[];
  /** No form match and we couldn’t read a name from the filename */
  unmatchedMedia: MemoryFile[];
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

  const byPerson = new Map<string, MemoryFile[]>();
  const byFilenameName = new Map<string, MemoryFile[]>();
  const unmatchedMedia: MemoryFile[] = [];

  for (const { relPath, baseName } of files) {
    const match = pickBestPersonMatch(baseName, scoredPeople, 55);
    const group = match
      ? people.find((p) => p.key === match.person.key)
      : undefined;

    const file: MemoryFile = {
      id: relPath,
      fileName: relPath,
      url: publicUrlForMemory(relPath),
      kind: VIDEO_RE.test(baseName) ? "video" : "image",
    };

    if (match && group) {
      const key = group.key;
      if (!byPerson.has(key)) byPerson.set(key, []);
      byPerson.get(key)!.push(file);
      continue;
    }

    const parsed = displayNameFromFilename(baseName);
    if (parsed) {
      const fk = normalizeNameKey(parsed);
      if (!byFilenameName.has(fk)) byFilenameName.set(fk, []);
      byFilenameName.get(fk)!.push(file);
    } else {
      unmatchedMedia.push(file);
    }
  }

  const albums: PersonAlbum[] = [];

  for (const p of people) {
    const media = byPerson.get(p.key);
    if (!media?.length) continue;
    media.sort((a, b) => a.fileName.localeCompare(b.fileName));
    albums.push({
      nameKey: p.key,
      displayName: p.displayName,
      submissions: p.submissions,
      media,
      fromFilenameOnly: false,
    });
  }

  for (const [fk, media] of byFilenameName) {
    media.sort((a, b) => a.fileName.localeCompare(b.fileName));
    const labelFromFile = displayNameFromFilename(media[0]!.fileName);
    const pretty = labelFromFile ?? fk;
    albums.push({
      nameKey: `__file__${fk}`,
      displayName: `Photos from ${pretty}`,
      submissions: [],
      media,
      fromFilenameOnly: true,
    });
  }

  albums.sort((a, b) => {
    const af = a.fromFilenameOnly ? 1 : 0;
    const bf = b.fromFilenameOnly ? 1 : 0;
    if (af !== bf) return af - bf;
    return a.displayName.localeCompare(b.displayName);
  });

  unmatchedMedia.sort((a, b) => a.fileName.localeCompare(b.fileName));

  const keysWithFormMedia = new Set(
    people.filter((p) => byPerson.get(p.key)?.length).map((p) => p.key),
  );

  const storiesWithoutMedia: MemoryStory[] = people
    .filter((g) => !keysWithFormMedia.has(g.key))
    .map((g) => ({
      displayName: g.displayName,
      nameKey: g.key,
      submissions: g.submissions,
      hasPhoto: false,
    }));

  return {
    generatedAt: new Date().toISOString(),
    albums,
    unmatchedMedia,
    storiesWithoutMedia,
  };
}

/** @deprecated */
export type MemoryMedia = MemoryFile & {
  matchedName?: string | null;
  matchScore?: number | null;
  submissions?: import("./sheet").SheetSubmission[];
};

/** @deprecated */
export type MemoryPhoto = MemoryMedia;
