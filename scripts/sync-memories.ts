/**
 * Refresh local data used by the site:
 * 1. Downloads the Google Sheet as data/memories/submissions.csv
 * 2. If DROPBOX_ACCESS_TOKEN is set, downloads images only (no video) from the shared folder into public/memories/
 *
 * Usage: npm run sync:memories
 * Optional .env.local: DROPBOX_ACCESS_TOKEN, DROPBOX_SHARED_FOLDER_URL, GOOGLE_SHEET_CSV_URL
 */

import { config } from "dotenv";
import { mkdir, readdir, rm, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  getTemporaryLinksBatched,
  listSharedFolderImages,
} from "../lib/dropbox";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

config({ path: join(root, ".env.local") });
config({ path: join(root, ".env") });

const DEFAULT_SHEET_CSV =
  "https://docs.google.com/spreadsheets/d/1GYhHVkTpQtcXTEMUFjQHCs0DgRfA-VS8dFhuCDRB7Dw/export?format=csv&gid=253822378";

const DEFAULT_DROPBOX_FOLDER =
  "https://www.dropbox.com/scl/fo/1rgt2ngvykre8yj0y5xzk/ALOX2PTKGs3zxPETDEuo_ns?rlkey=fuy1peo1mu698zvkl8zy1yius&dl=0";

const dataDir = join(root, "data", "memories");
const outDir = join(root, "public", "memories");

async function emptyMemoriesDir() {
  let entries;
  try {
    entries = await readdir(outDir, { withFileTypes: true });
  } catch {
    await mkdir(outDir, { recursive: true });
    return;
  }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const p = join(outDir, e.name);
    await rm(p, { recursive: true, force: true });
  }
}

function dropboxRelPath(pathLower: string): string {
  return pathLower.replace(/^\//, "");
}

async function main() {
  const sheetUrl = process.env.GOOGLE_SHEET_CSV_URL?.trim() || DEFAULT_SHEET_CSV;
  console.log("Fetching CSV…");
  const csvRes = await fetch(sheetUrl);
  if (!csvRes.ok) {
    throw new Error(`CSV fetch failed: ${csvRes.status} ${sheetUrl}`);
  }
  const csvText = await csvRes.text();
  await mkdir(dataDir, { recursive: true });
  await writeFile(join(dataDir, "submissions.csv"), csvText, "utf8");
  console.log(`Wrote ${join("data", "memories", "submissions.csv")}`);

  const token = process.env.DROPBOX_ACCESS_TOKEN?.trim();
  if (!token) {
    console.log(
      "Skip Dropbox (set DROPBOX_ACCESS_TOKEN in .env.local to download photos).",
    );
    await mkdir(outDir, { recursive: true });
    return;
  }

  const folderUrl =
    process.env.DROPBOX_SHARED_FOLDER_URL?.trim() || DEFAULT_DROPBOX_FOLDER;

  console.log("Listing Dropbox folder (recursive)…");
  const files = await listSharedFolderImages(token, folderUrl, {
    recursive: true,
  });
  console.log(`Found ${files.length} image file(s).`);

  await emptyMemoriesDir();

  const links = await getTemporaryLinksBatched(token, files, 8);
  let ok = 0;
  for (const f of files) {
    const url = links.get(f.pathLower);
    if (!url) {
      console.warn("No link:", f.name);
      continue;
    }
    const rel = dropboxRelPath(f.pathLower);
    const dest = join(outDir, rel);
    await mkdir(dirname(dest), { recursive: true });
    const imgRes = await fetch(url);
    if (!imgRes.ok) {
      console.warn("Download failed:", f.name, imgRes.status);
      continue;
    }
    const buf = Buffer.from(await imgRes.arrayBuffer());
    await writeFile(dest, buf);
    ok++;
  }
  console.log(`Downloaded ${ok} image(s) into public/memories/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
