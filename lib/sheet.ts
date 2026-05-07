import Papa from "papaparse";
import { normalizeNameKey } from "./nameMatch";

export type SheetSubmission = {
  timestamp: string;
  name: string;
  nameKey: string;
  message: string;
};

function stripBom(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) return text.slice(1);
  return text;
}

/**
 * Google Form CSV exports often use `M/D/YYYY H:mm:ss` (US). Parse to epoch ms
 * so sorting is reliable across environments (plain `new Date(str)` is flaky).
 */
function submissionTimeMs(timestamp: string): number {
  const t = timestamp.trim();
  if (!t) return NaN;
  const m = t.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
  );
  if (m) {
    const month = parseInt(m[1]!, 10) - 1;
    const day = parseInt(m[2]!, 10);
    const year = parseInt(m[3]!, 10);
    const hh = m[4] ? parseInt(m[4], 10) : 0;
    const mm = m[5] ? parseInt(m[5], 10) : 0;
    const ss = m[6] ? parseInt(m[6], 10) : 0;
    return new Date(year, month, day, hh, mm, ss).getTime();
  }
  const parsed = Date.parse(t);
  return Number.isNaN(parsed) ? NaN : parsed;
}

function detectColumns(headers: string[]): {
  timestamp: string;
  name: string;
  message: string;
} {
  const h = headers.map((x) => x.trim());
  const lower = h.map((x) => x.toLowerCase());

  const timestamp =
    h.find((_, i) => lower[i] === "timestamp") ??
    h.find((_, i) => lower[i].includes("time")) ??
    h[0]!;

  const name =
    h.find(
      (_, i) =>
        lower[i].includes("name") &&
        (lower[i].includes("first") || lower[i].includes("last")),
    ) ??
    h.find((_, i) => lower[i].includes("name")) ??
    h[1]!;

  const message =
    h.find(
      (_, i) =>
        lower[i].includes("share") ||
        lower[i].includes("message") ||
        lower[i].includes("anything"),
    ) ??
    h.find((_, i) => !lower[i].includes("timestamp") && i > 0) ??
    h[2]!;

  return { timestamp, name, message };
}

export function parseFormSheetCsv(csvText: string): SheetSubmission[] {
  const text = stripBom(csvText);
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors.length) {
    const fatal = parsed.errors.find((e) => e.type === "Quotes" || e.type === "FieldMismatch");
    if (fatal) {
      throw new Error(`CSV parse error: ${fatal.message}`);
    }
  }

  const headers = parsed.meta.fields?.filter(Boolean) ?? [];
  if (headers.length < 2) {
    throw new Error("CSV missing headers");
  }

  const cols = detectColumns(headers);
  const rows: SheetSubmission[] = [];

  for (const row of parsed.data) {
    const timestamp = (row[cols.timestamp] ?? "").trim();
    const name = (row[cols.name] ?? "").trim();
    const message = (row[cols.message] ?? "").trim();
    if (!name && !message) continue;
    rows.push({
      timestamp,
      name,
      nameKey: normalizeNameKey(name),
      message,
    });
  }

  return rows;
}

export type PersonGroup = {
  key: string;
  displayName: string;
  submissions: SheetSubmission[];
};

export function groupSubmissionsByPerson(rows: SheetSubmission[]): PersonGroup[] {
  const map = new Map<string, SheetSubmission[]>();
  for (const row of rows) {
    const trimmedName = row.name.trim();
    const key = trimmedName
      ? row.nameKey || normalizeNameKey(row.name)
      : "__anonymous__";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }

  const groups: PersonGroup[] = [];
  for (const [key, submissions] of map) {
    if (key === "__anonymous__" && submissions.every((s) => !s.message.trim())) {
      continue;
    }
    const withName = submissions.filter((s) => s.name.trim());
    const displayName =
      withName.sort((a, b) => b.name.length - a.name.length)[0]?.name.trim() ??
      (key === "__anonymous__"
        ? "Anonymous"
        : submissions[0]!.name.trim() || "Friend");
    submissions.sort((a, b) => {
      const ta = submissionTimeMs(a.timestamp);
      const tb = submissionTimeMs(b.timestamp);
      if (Number.isNaN(ta) && Number.isNaN(tb)) {
        return a.timestamp.localeCompare(b.timestamp);
      }
      if (Number.isNaN(ta)) return 1;
      if (Number.isNaN(tb)) return -1;
      return ta - tb; /* oldest first → newest last */
    });
    groups.push({
      key,
      displayName,
      submissions,
    });
  }

  return groups.sort((a, b) => a.displayName.localeCompare(b.displayName));
}
