import { join } from "path";

/** Samsung/Dropbox exports: `20241226_113118_658489 Name.jpeg` */
const FILENAME_DATE_RE = /^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/;

export function photoTakenMsFromFilename(baseName: string): number | null {
  const base = baseName.replace(/^.*\//, "");
  const m = base.match(FILENAME_DATE_RE);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const ms = new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(s),
  ).getTime();
  return Number.isNaN(ms) ? null : ms;
}

async function photoTakenMsFromExif(absPath: string): Promise<number | null> {
  try {
    const exifr = await import("exifr");
    const tags = await exifr.parse(absPath, {
      pick: ["DateTimeOriginal", "CreateDate", "ModifyDate"],
    });
    const raw =
      tags?.DateTimeOriginal ?? tags?.CreateDate ?? tags?.ModifyDate;
    if (raw == null) return null;
    const ms = new Date(raw as string | Date).getTime();
    return Number.isNaN(ms) ? null : ms;
  } catch {
    return null;
  }
}

/**
 * Best-effort capture time for sorting. Avoids filesystem mtime — it resets when
 * files are copied or run through `optimize:memories`, which made some albums look "today".
 */
export async function resolvePhotoTakenMs(
  memoriesPublicDir: string,
  relPath: string,
  baseName: string,
): Promise<number> {
  const fromName = photoTakenMsFromFilename(baseName);
  if (fromName != null) return fromName;

  const absPath = join(memoriesPublicDir, relPath);
  const fromExif = await photoTakenMsFromExif(absPath);
  if (fromExif != null) return fromExif;

  return 0;
}
