/**
 * Resize + recompress images under public/memories/, public/hero-carousel/,
 * and public/leroy-hero.jpeg to save repo & Vercel space.
 * Also writes public/og.jpg (1200×630) from leroy-hero.jpeg for link previews.
 * GIFs are skipped. (Videos are gitignored under public/memories/ — do not add them.)
 *
 * Defaults: long edge max 1600px, MozJPEG Q78. PNG with alpha stays PNG (compressed).
 *
 * Usage:
 *   npm run optimize:memories           # optimize in place
 *   npm run optimize:memories -- --dry-run
 */
import { mkdir, readdir, readFile, rename, stat, unlink, writeFile } from "fs/promises";
import { join, extname, basename, dirname } from "path";
import sharp from "sharp";

const MEMORIES_ROOT = join(process.cwd(), "public", "memories");
const HERO_CAROUSEL_ROOT = join(process.cwd(), "public", "hero-carousel");
const MAX_LONG_EDGE = 1600;
const JPEG_QUALITY = 78;

const VIDEO_RE = /\.(mp4|mov|webm)$/i;
/** GIF skipped — animated/static GIF handling is unpredictable */
const IMAGE_RE =
  /\.(jpe?g|png|webp|heic|avif|bmp|tiff?)$/i;

const dryRun = process.argv.includes("--dry-run");

type Agg = {
  files: number;
  bytesBefore: number;
  bytesAfter: number;
  skipped: number;
  errors: number;
};

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await walk(full)));
    } else if (e.isFile() && IMAGE_RE.test(e.name) && !VIDEO_RE.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

function jpegExtFor(ext: string): string {
  const e = ext.toLowerCase();
  return e === ".jpg" || e === ".jpeg" ? ext : ".jpg";
}

async function optimizeOne(absPath: string, agg: Agg): Promise<void> {
  const beforeStat = await stat(absPath);
  const beforeSize = beforeStat.size;
  agg.bytesBefore += beforeSize;
  agg.files += 1;

  const ext = extname(absPath);
  const extLower = ext.toLowerCase();

  const input = await readFile(absPath);
  const meta = await sharp(input).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) {
    agg.skipped += 1;
    agg.bytesAfter += beforeSize;
    console.warn(`  skip (no dimensions): ${absPath}`);
    return;
  }

  const hasAlpha =
    meta.hasAlpha === true ||
    (meta.channels === 4 && (extLower === ".png" || extLower === ".webp"));

  const pipeline = sharp(input)
    .rotate()
    .resize(MAX_LONG_EDGE, MAX_LONG_EDGE, {
      fit: "inside",
      withoutEnlargement: true,
    });

  let outBuf: Buffer;
  let outExt: string;

  if (hasAlpha) {
    outBuf = await pipeline.png({ compressionLevel: 9, effort: 7 }).toBuffer();
    outExt = ".png";
  } else {
    outBuf = await pipeline
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
    outExt = jpegExtFor(ext);
  }

  const dir = dirname(absPath);
  const baseNoExt = basename(absPath, ext);
  const targetPath = join(dir, `${baseNoExt}${outExt}`);

  const maxDim = Math.max(w, h);
  const resized = maxDim > MAX_LONG_EDGE;
  const smaller = outBuf.length < beforeSize;
  const extensionChange = outExt.toLowerCase() !== extLower;

  if (!resized && !smaller && !extensionChange) {
    agg.skipped += 1;
    agg.bytesAfter += beforeSize;
    return;
  }

  if (dryRun) {
    const pct = ((1 - outBuf.length / beforeSize) * 100).toFixed(1);
    console.log(
      `  ${(beforeSize / 1024).toFixed(0)} KB → ${(outBuf.length / 1024).toFixed(0)} KB (−${pct}%): ${absPath}`,
    );
    agg.bytesAfter += outBuf.length;
    return;
  }

  if (targetPath === absPath) {
    await writeFile(absPath, outBuf);
  } else {
    const tmp = join(dir, `.opt-${baseNoExt}-${Date.now()}.tmp`);
    await writeFile(tmp, outBuf);
    await unlink(absPath);
    try {
      await rename(tmp, targetPath);
    } catch {
      await mkdir(dirname(targetPath), { recursive: true });
      await rename(tmp, targetPath);
    }
  }

  agg.bytesAfter += outBuf.length;
}

async function writeOpenGraphThumbnail(): Promise<void> {
  const heroPath = join(process.cwd(), "public", "leroy-hero.jpeg");
  const outPath = join(process.cwd(), "public", "og.jpg");
  try {
    await stat(heroPath);
  } catch {
    console.warn("Skip og.jpg — public/leroy-hero.jpeg missing");
    return;
  }
  const input = await readFile(heroPath);
  const pipeline = sharp(input).rotate().resize(1200, 630, {
    fit: "cover",
    position: "attention",
  });
  const buf = await pipeline
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
  if (dryRun) {
    console.log(
      `Dry run — og.jpg would be ${(buf.length / 1024).toFixed(0)} KB (from leroy-hero.jpeg)`,
    );
    return;
  }
  await writeFile(outPath, buf);
  console.log(`Wrote ${outPath} (${(buf.length / 1024).toFixed(0)} KB)`);
}

async function main() {
  const files = [
    ...(await walk(MEMORIES_ROOT)),
    ...(await walk(HERO_CAROUSEL_ROOT)),
  ];
  const hero = join(process.cwd(), "public", "leroy-hero.jpeg");
  try {
    await stat(hero);
    files.push(hero);
  } catch {
    /* optional */
  }

  const unique = [...new Set(files)];

  const agg: Agg = {
    files: 0,
    bytesBefore: 0,
    bytesAfter: 0,
    skipped: 0,
    errors: 0,
  };

  if (unique.length > 0) {
    console.log(
      dryRun
        ? `Dry run — ${unique.length} images (no writes)`
        : `Optimizing ${unique.length} images…`,
    );

    for (const f of unique.sort()) {
      try {
        await optimizeOne(f, agg);
      } catch (e) {
        agg.errors += 1;
        console.error(`  error: ${f}`, e);
      }
    }

    const saved = agg.bytesBefore - agg.bytesAfter;
    const savedMb = saved / (1024 * 1024);
    console.log(
      `\nDone. processed ${agg.files} images, skipped ${agg.skipped}, errors ${agg.errors}.`,
    );
    console.log(
      `Size: ${(agg.bytesBefore / (1024 * 1024)).toFixed(2)} MB → ${(agg.bytesAfter / (1024 * 1024)).toFixed(2)} MB (${savedMb >= 0 ? "saved" : "grew"} ${Math.abs(savedMb).toFixed(2)} MB).`,
    );
  } else {
    console.log("No images under public/memories or public/hero-carousel");
  }

  await writeOpenGraphThumbnail();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
