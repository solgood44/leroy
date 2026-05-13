/**
 * Builds `data/memories/payload.json` from the CSV + `public/memories/` scan.
 * Run before `next dev` / `next build` so `/api/memories` only imports JSON
 * (Vercel otherwise bundles all images into the serverless function).
 *
 * Usage: npm run build:memories-data
 */

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { buildMemories } from "../lib/memories";

const outPath = join(process.cwd(), "data", "memories", "payload.json");

async function main() {
  const payload = await buildMemories();
  await mkdir(join(process.cwd(), "data", "memories"), { recursive: true });
  const json = JSON.stringify(payload);
  await writeFile(outPath, json, "utf8");
  console.log(
    `Wrote ${outPath} (${(Buffer.byteLength(json, "utf8") / 1024).toFixed(1)} KB)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
