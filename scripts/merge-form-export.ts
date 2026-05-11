/**
 * Merge a fresh Google Form export into data/memories/submissions.csv.
 * Dedupes identical name + message (keeps earliest timestamp). Run manually when needed.
 *
 *   npx tsx scripts/merge-form-export.ts <path-to-new-export.csv>
 */
import { readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import Papa from "papaparse";
import { normalizeNameKey } from "../lib/nameMatch";
import { parseFormSheetCsv, submissionTimeMs, type SheetSubmission } from "../lib/sheet";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const DEFAULT_EXISTING = join(root, "data", "memories", "submissions.csv");

const HEADERS = [
  "Timestamp",
  "First and Last Name",
  "Type anything you'd like to share below",
] as const;

function dedupeKey(s: SheetSubmission): string {
  return `${normalizeNameKey(s.name)}::${s.message.trim()}`;
}

function mergeRows(existing: SheetSubmission[], incoming: SheetSubmission[]): SheetSubmission[] {
  const best = new Map<string, SheetSubmission>();

  function consider(s: SheetSubmission) {
    const k = dedupeKey(s);
    const prev = best.get(k);
    if (!prev) {
      best.set(k, s);
      return;
    }
    const tNew = submissionTimeMs(s.timestamp);
    const tOld = submissionTimeMs(prev.timestamp);
    if (!Number.isNaN(tNew) && !Number.isNaN(tOld) && tNew < tOld) {
      best.set(k, s);
    } else if (Number.isNaN(tOld) && !Number.isNaN(tNew)) {
      best.set(k, s);
    }
  }

  for (const s of existing) consider(s);
  for (const s of incoming) consider(s);

  const out = [...best.values()];
  out.sort((a, b) => {
    const ta = submissionTimeMs(a.timestamp);
    const tb = submissionTimeMs(b.timestamp);
    if (Number.isNaN(ta) && Number.isNaN(tb)) return a.timestamp.localeCompare(b.timestamp);
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return ta - tb;
  });
  return out;
}

function toCsv(rows: SheetSubmission[]): string {
  const objects = rows.map((r) => ({
    [HEADERS[0]]: r.timestamp,
    [HEADERS[1]]: r.name,
    [HEADERS[2]]: r.message,
  }));
  return Papa.unparse(objects, { columns: [...HEADERS] });
}

async function main() {
  const incomingPath = process.argv[2];
  if (!incomingPath) {
    console.error("Usage: npx tsx scripts/merge-form-export.ts <new-export.csv>");
    process.exit(1);
  }
  const existingText = await readFile(DEFAULT_EXISTING, "utf8");
  const incomingText = await readFile(incomingPath, "utf8");

  const existing = parseFormSheetCsv(existingText);
  const incoming = parseFormSheetCsv(incomingText);
  const merged = mergeRows(existing, incoming);

  const before = existing.length;
  const after = merged.length;
  console.log(`Rows: existing ${before}, incoming ${incoming.length}, merged ${after} (removed ${before + incoming.length - after} duplicates).`);

  /** LF-only: CRLF breaks Papa on some multiline quoted fields */
  await writeFile(DEFAULT_EXISTING, toCsv(merged).replace(/\r\n/g, "\n") + "\n", "utf8");
  console.log(`Wrote ${DEFAULT_EXISTING}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
