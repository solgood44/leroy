# LeRoy — memories

A simple Next.js site: **photos** from `public/memories/` are **grouped by person**. If they’re on the Google Form CSV, their notes appear; if not, the heading is **Photos from [name]** using the name parsed from the filename. **Video files are not kept in the repo** (they break Vercel’s serverless size limit); use Dropbox or YouTube for clips if needed.

## Update the content

There is **no GitHub Actions automation** in this repo—refresh data on your machine, then commit and push (Vercel deploys from `main`).

1. Replace **`data/memories/submissions.csv`** with a fresh export from the Google Sheet (same columns: timestamp, name, message), or run **`npm run sync:memories`** locally (uses `GOOGLE_SHEET_CSV_URL` from `.env.local` or the default public CSV export in `scripts/sync-memories.ts`; the sheet tab must stay **viewable by anyone with the link** if you rely on that URL).
2. Add or replace **image** files in **`public/memories/`** (JPEG/PNG/WebP, etc.). Filenames like `IMG_1234 Millie Wibert.jpeg` work well—the site strips camera/UUID prefixes and matches the **last two words** to **“First and Last Name”** on the form (with fuzzy matching, e.g. Millicent ↔ Millie when the last name matches).

Optional: **`npm run sync:memories`** also downloads from the Dropbox folder when `DROPBOX_ACCESS_TOKEN` is set in `.env.local` (see `.env.example`). After a pull, run **`npm run optimize:memories`**, then **`npm run build:memories-data`** so `public/memories-payload.json` and the hero filename manifest match the folders before you commit.

### Keeping the site light

- **Build-time data:** There is **no `/api/memories` route**. The browser loads **`/memories-payload.json`** (static, CDN). It is produced by **`npm run build:memories-data`** from the CSV + filenames under `public/memories/`. The **home page** does not call `fs` on `public/hero-carousel` (that used to trace every hero image into the server bundle); filenames come from generated **`lib/heroCarouselManifest.generated.ts`**.
- **Thumbnails:** Carousel tiles use Next.js `Image` with `quality={75}` and `sizes` capped to the viewport width of the carousel (see `app/components/LeroyMemories.tsx`).
- **Full-screen view:** The lightbox uses a plain `<img>` on the optimized static JPEG/PNG.
- **Repo size / Vercel:** Only **images** live under `public/memories/`. **Do not commit `.mp4` / `.mov`** — they are gitignored. Avoid **`fs.readdir` on `public/`** in server components or API routes, or Next may pack those files into a serverless function.
- **Link preview:** `public/og.jpg` (1200×630) is regenerated when you run **`npm run optimize:memories`** from `leroy-hero.jpeg`. Set **`NEXT_PUBLIC_SITE_URL`** to your production URL so shared links resolve images correctly (see `.env.example`).
- **Hero carousel:** `public/leroy-hero.jpeg` plus files in **`public/hero-carousel/`**; after adding/removing hero images, run **`npm run build:memories-data`** to refresh the generated filename list.

## Run locally

```bash
npm install
npm run dev
```

## Deploy (Vercel)

Import the repo and deploy. No environment variables are required if CSV, `public/memories-payload.json`, `lib/heroCarouselManifest.generated.ts`, and media are committed.

**If the build log shows `sh: tsx: command not found`:** Vercel (or another host) installed without devDependencies. This project keeps **`tsx` in `dependencies`** so `npm run build:memories-data` always runs before `next build`.

**If a deploy fails on function size again:** In the Vercel project, add **`VERCEL_ANALYZE_BUILD_OUTPUT=1`**, redeploy, and read the build log for per-function size and the largest traced files. For Next.js you can also try **`VERCEL_BUILDER_DEBUG=1`** for extra size detail. That confirms whether the problem is still “static assets traced into a serverless route” vs a heavy `node_modules` dependency.

**Why “optimize photos” alone wasn’t enough:** `public/` is served from the **CDN**, but **any server code that `readdir`s or reads those files** can make Next **trace the binaries into a serverless bundle** (300MB+ when `public/memories` was tied to an API route, and **~8MB+ of hero images** when `page.tsx` listed `public/hero-carousel` at build time). The site now uses **static `memories-payload.json` + a generated filename list** so server bundles stay tiny. **`npm run optimize:memories`** (long edge **1600px**, MozJPEG **Q78**) shrinks **git, bandwidth, and lightbox weight**.

**Staying lightweight when adding photos:** Keep using **`optimize:memories`** before commit; do not put **video** under `public/memories/` (gitignored); after adding or renaming files, ensure **`build:memories-data`** runs (it runs automatically before `dev` / `build`). Prefer **JPEG/WebP** at modest dimensions; avoid shipping **full‑resolution RAW exports**. If the gallery JSON ever grows huge, consider splitting payload by route or pagination later.

## Scripts

- `npm run build:memories-data` — write `public/memories-payload.json` + `lib/heroCarouselManifest.generated.ts` (runs automatically before `dev` / `build`)  
- `npm run dev` — regenerates payload, then dev server  
- `npm run build` — regenerates payload, then production build  
- `npm run lint` — ESLint  
- `npm run sync:memories` — fetch sheet CSV; optional Dropbox download when token is set  
- `npm run optimize:memories` — resize / recompress (long edge **1600px**, Q78) under `public/memories/`, `public/hero-carousel/`, `public/leroy-hero.jpeg`, and write `public/og.jpg`  
