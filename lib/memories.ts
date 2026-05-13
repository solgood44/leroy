import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import {
  displayNameFromFilename,
  normalizeNameKey,
  pickBestPersonMatch,
  type ScoredPerson,
} from "./nameMatch";
import { groupSubmissionsByPerson, parseFormSheetCsv, submissionTimeMs } from "./sheet";

/** One image file (no form text — that lives on the person album). */
export type MemoryFile = {
  id: string;
  fileName: string;
  url: string;
};

type MediaWithMtime = {
  file: MemoryFile;
  mtimeMs: number;
};

export type AlbumTimelinePhoto = {
  kind: "photo";
  sortKeyMs: number;
  /** Human-readable date/time for this item */
  when: string;
  file: MemoryFile;
};

export type AlbumTimelineNote = {
  kind: "note";
  sortKeyMs: number;
  when: string;
  submission: import("./sheet").SheetSubmission;
};

export type AlbumTimelineEntry = AlbumTimelinePhoto | AlbumTimelineNote;

/** Grouped media: form submissions and/or name parsed from filenames. */
export type PersonAlbum = {
  nameKey: string;
  /** e.g. "Millie Wibert" or "Photos from Kirk Riley" */
  displayName: string;
  submissions: import("./sheet").SheetSubmission[];
  media: MemoryFile[];
  /** Photos and form notes interleaved by sort key (used for dates + album recency) */
  timeline: AlbumTimelineEntry[];
  /** True when there was no Google Form row—label comes from Dropbox filename only */
  fromFilenameOnly?: boolean;
};

/** Every form submission with text, one place, sorted newest-first by send time. */
export type ChronologicalFormMessage = {
  sortKeyMs: number;
  when: string;
  personKey: string;
  displayName: string;
  signedName: string;
  message: string;
  sourceOrder: number;
  hasMatchedPhotos: boolean;
  /** Newest matched gallery image for this person (pairs blurb with their photos). */
  matchedPhotoUrl: string | null;
};

export type MemoriesPayload = {
  generatedAt: string;
  albums: PersonAlbum[];
  /** No form match and we couldn’t read a name from the filename */
  unmatchedMedia: MemoryFile[];
  formMessagesChronological: ChronologicalFormMessage[];
};

/** Images only — video files are not supported in public/memories (Vercel bundle limit). */
const IMAGE_RE = /\.(jpe?g|png|gif|webp|heic|avif|bmp|tif?f)$/i;

const CSV_PATH = join(process.cwd(), "data", "memories", "submissions.csv");
const MEMORIES_PUBLIC_DIR = join(process.cwd(), "public", "memories");

function maxTimestampMs(
  submissions: { timestamp: string }[],
): number {
  let m = 0;
  for (const s of submissions) {
    const t = submissionTimeMs(s.timestamp);
    if (!Number.isNaN(t) && t > m) m = t;
  }
  return m;
}

async function listMemoryMedia(): Promise<
  { relPath: string; baseName: string; mtimeMs: number }[]
> {
  async function walk(
    dir: string,
    prefix: string,
  ): Promise<{ relPath: string; baseName: string; mtimeMs: number }[]> {
    const out: { relPath: string; baseName: string; mtimeMs: number }[] = [];
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
        const st = await stat(full);
        out.push({ relPath: rel, baseName: e.name, mtimeMs: Math.round(st.mtimeMs) });
      }
    }
    return out;
  }
  return walk(MEMORIES_PUBLIC_DIR, "");
}

function sortMediaNewestFirst(items: MediaWithMtime[]): MemoryFile[] {
  items.sort((a, b) => {
    if (b.mtimeMs !== a.mtimeMs) return b.mtimeMs - a.mtimeMs;
    return b.file.fileName.localeCompare(a.file.fileName);
  });
  return items.map((x) => x.file);
}

function albumRecencyMs(media: MediaWithMtime[], submissions: { timestamp: string }[]): number {
  const mt = media.length ? Math.max(...media.map((x) => x.mtimeMs)) : 0;
  return Math.max(mt, maxTimestampMs(submissions));
}

function formatTimelineWhen(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildFormMessagesChronological(
  people: import("./sheet").PersonGroup[],
  keysWithMatchedPhotos: Set<string>,
  matchedPhotoUrlByPerson: Map<string, string>,
): ChronologicalFormMessage[] {
  const rows: ChronologicalFormMessage[] = [];
  for (const p of people) {
    for (const s of p.submissions) {
      if (!s.message.trim()) continue;
      const t = submissionTimeMs(s.timestamp);
      rows.push({
        sortKeyMs: Number.isNaN(t) ? 0 : t,
        when: Number.isNaN(t)
          ? s.timestamp.trim() || "Date unknown"
          : formatTimelineWhen(t),
        personKey: p.key,
        displayName: p.displayName,
        signedName: s.name.trim(),
        message: s.message.trim(),
        sourceOrder: s.sourceOrder,
        hasMatchedPhotos: keysWithMatchedPhotos.has(p.key),
        matchedPhotoUrl: matchedPhotoUrlByPerson.get(p.key) ?? null,
      });
    }
  }
  rows.sort((a, b) => {
    if (b.sortKeyMs !== a.sortKeyMs) return b.sortKeyMs - a.sortKeyMs;
    return b.sourceOrder - a.sourceOrder;
  });
  return rows;
}

function buildTimeline(
  tagged: MediaWithMtime[],
  submissions: import("./sheet").SheetSubmission[],
): AlbumTimelineEntry[] {
  const entries: AlbumTimelineEntry[] = [];
  for (const { file, mtimeMs } of tagged) {
    entries.push({
      kind: "photo",
      sortKeyMs: mtimeMs,
      when: formatTimelineWhen(mtimeMs),
      file,
    });
  }
  for (const s of submissions) {
    if (!s.message.trim()) continue;
    const t = submissionTimeMs(s.timestamp);
    entries.push({
      kind: "note",
      sortKeyMs: Number.isNaN(t) ? 0 : t,
      when: Number.isNaN(t) ? (s.timestamp.trim() || "Date unknown") : formatTimelineWhen(t),
      submission: s,
    });
  }
  entries.sort((a, b) => {
    if (b.sortKeyMs !== a.sortKeyMs) return b.sortKeyMs - a.sortKeyMs;
    if (a.kind === "note" && b.kind === "note") {
      return b.submission.sourceOrder - a.submission.sourceOrder;
    }
    if (a.kind !== b.kind) return a.kind === "photo" ? 1 : -1;
    return 0;
  });
  return entries;
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

  const byPerson = new Map<string, MediaWithMtime[]>();
  const byFilenameName = new Map<string, MediaWithMtime[]>();
  const unmatchedTagged: MediaWithMtime[] = [];

  for (const { relPath, baseName, mtimeMs } of files) {
    const match = pickBestPersonMatch(baseName, scoredPeople, 55);
    const group = match
      ? people.find((p) => p.key === match.person.key)
      : undefined;

    const file: MemoryFile = {
      id: relPath,
      fileName: relPath,
      url: publicUrlForMemory(relPath),
    };
    const tagged: MediaWithMtime = { file, mtimeMs };

    if (match && group) {
      const key = group.key;
      if (!byPerson.has(key)) byPerson.set(key, []);
      byPerson.get(key)!.push(tagged);
      continue;
    }

    const parsed = displayNameFromFilename(baseName);
    if (parsed) {
      const fk = normalizeNameKey(parsed);
      if (!byFilenameName.has(fk)) byFilenameName.set(fk, []);
      byFilenameName.get(fk)!.push(tagged);
    } else {
      unmatchedTagged.push(tagged);
    }
  }

  /** Attach filename-only buckets to the closest form person (exact name or fuzzy). */
  function mergeFilenameBucketsIntoFormPeople(): void {
    for (const fk of [...byFilenameName.keys()]) {
      const tagged = byFilenameName.get(fk);
      if (!tagged?.length) continue;
      const sampleBase =
        tagged[0]!.file.fileName.replace(/^.*\//, "") ||
        tagged[0]!.file.fileName;
      const pretty = displayNameFromFilename(sampleBase);
      if (pretty) {
        const nk = normalizeNameKey(pretty);
        const direct = people.find((p) => p.key === nk);
        if (direct) {
          if (!byPerson.has(direct.key)) byPerson.set(direct.key, []);
          byPerson.get(direct.key)!.push(...tagged);
          byFilenameName.delete(fk);
          continue;
        }
      }
      let match = pickBestPersonMatch(sampleBase, scoredPeople, 45);
      if (!match) match = pickBestPersonMatch(sampleBase, scoredPeople, 38);
      if (match) {
        const { key } = match.person;
        if (!byPerson.has(key)) byPerson.set(key, []);
        byPerson.get(key)!.push(...tagged);
        byFilenameName.delete(fk);
      }
    }
  }

  mergeFilenameBucketsIntoFormPeople();

  type AlbumDraft = { album: PersonAlbum; recencyMs: number };
  const albumDrafts: AlbumDraft[] = [];

  for (const p of people) {
    const tagged = byPerson.get(p.key);
    if (!tagged?.length) continue;
    const media = sortMediaNewestFirst(tagged);
    const timeline = buildTimeline(tagged, p.submissions);
    albumDrafts.push({
      recencyMs: albumRecencyMs(tagged, p.submissions),
      album: {
        nameKey: p.key,
        displayName: p.displayName,
        submissions: p.submissions,
        media,
        timeline,
        fromFilenameOnly: false,
      },
    });
  }

  for (const [fk, tagged] of byFilenameName) {
    const media = sortMediaNewestFirst(tagged);
    const timeline = buildTimeline(tagged, []);
    const labelFromFile = displayNameFromFilename(media[0]!.fileName);
    const pretty = labelFromFile ?? fk;
    albumDrafts.push({
      recencyMs: albumRecencyMs(tagged, []),
      album: {
        nameKey: `__file__${fk}`,
        displayName: `Photos from ${pretty}`,
        submissions: [],
        media,
        timeline,
        fromFilenameOnly: true,
      },
    });
  }

  albumDrafts.sort((a, b) => {
    if (b.recencyMs !== a.recencyMs) return b.recencyMs - a.recencyMs;
    const af = a.album.fromFilenameOnly ? 1 : 0;
    const bf = b.album.fromFilenameOnly ? 1 : 0;
    if (af !== bf) return af - bf;
    return a.album.displayName.localeCompare(b.album.displayName);
  });
  const albums = albumDrafts.map((d) => d.album);

  const unmatchedMedia = sortMediaNewestFirst(unmatchedTagged);

  const keysWithFormMedia = new Set(
    people.filter((p) => byPerson.get(p.key)?.length).map((p) => p.key),
  );

  const matchedPhotoUrlByPerson = new Map<string, string>();
  for (const p of people) {
    const tagged = byPerson.get(p.key);
    if (!tagged?.length) continue;
    const cover = sortMediaNewestFirst([...tagged])[0]!;
    matchedPhotoUrlByPerson.set(p.key, cover.url);
  }

  const formMessagesChronological = buildFormMessagesChronological(
    people,
    keysWithFormMedia,
    matchedPhotoUrlByPerson,
  );

  return {
    generatedAt: new Date().toISOString(),
    albums,
    unmatchedMedia,
    formMessagesChronological,
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
