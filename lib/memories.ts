import { getTemporaryLinksBatched, listSharedFolderImages } from "./dropbox";
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
  sheetUrl: string;
  dropboxConfigured: boolean;
  dropboxError: string | null;
  photos: MemoryPhoto[];
  storiesWithoutPhoto: MemoryStory[];
};

const DEFAULT_SHEET_CSV =
  "https://docs.google.com/spreadsheets/d/1GYhHVkTpQtcXTEMUFjQHCs0DgRfA-VS8dFhuCDRB7Dw/export?format=csv&gid=253822378";

const DEFAULT_DROPBOX_FOLDER =
  "https://www.dropbox.com/scl/fo/1rgt2ngvykre8yj0y5xzk/ALOX2PTKGs3zxPETDEuo_ns?rlkey=63no67lx3rt4pra4pwg75jfum&dl=0";

export async function buildMemories(options?: {
  sheetCsvUrl?: string;
  dropboxSharedFolderUrl?: string;
  dropboxToken?: string;
}): Promise<MemoriesPayload> {
  const sheetCsvUrl = options?.sheetCsvUrl?.trim() || DEFAULT_SHEET_CSV;
  const dropboxSharedFolderUrl =
    options?.dropboxSharedFolderUrl?.trim() || DEFAULT_DROPBOX_FOLDER;
  const dropboxToken = options?.dropboxToken?.trim();

  const sheetRes = await fetch(sheetCsvUrl);
  if (!sheetRes.ok) {
    throw new Error(
      `Google Sheet CSV fetch failed (${sheetRes.status}). Is the sheet shared as “Anyone with the link can view”?`,
    );
  }
  const csvText = await sheetRes.text();
  const rows = parseFormSheetCsv(csvText);
  const people = groupSubmissionsByPerson(rows);

  const scoredPeople: ScoredPerson[] = people.map((p) => ({
    key: p.key,
    displayName: p.displayName,
  }));

  const photos: MemoryPhoto[] = [];
  let dropboxError: string | null = null;
  let dropboxConfigured = Boolean(dropboxToken);

  if (dropboxToken) {
    try {
      const files = await listSharedFolderImages(dropboxToken, dropboxSharedFolderUrl);
      const links = await getTemporaryLinksBatched(dropboxToken, files, 8);

      for (const f of files) {
        const url = links.get(f.pathLower) ?? "";
        const match = pickBestPersonMatch(f.name, scoredPeople, 55);
        const group = match
          ? people.find((p) => p.key === match.person.key)
          : undefined;

        photos.push({
          id: f.pathLower,
          fileName: f.name,
          imageUrl: url,
          matchedName: match ? group?.displayName ?? match.person.displayName : null,
          matchScore: match?.score ?? null,
          submissions: group?.submissions ?? [],
        });
      }
    } catch (e) {
      dropboxConfigured = true;
      dropboxError = e instanceof Error ? e.message : String(e);
    }
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
    sheetUrl: sheetCsvUrl,
    dropboxConfigured,
    dropboxError,
    photos: photos.sort((a, b) => {
      const an = a.matchedName ?? a.fileName;
      const bn = b.matchedName ?? b.fileName;
      return an.localeCompare(bn);
    }),
    storiesWithoutPhoto,
  };
}

export { DEFAULT_SHEET_CSV, DEFAULT_DROPBOX_FOLDER };
