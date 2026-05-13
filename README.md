# LeRoy — memories

A simple Next.js site: **photos** from `public/memories/` are **grouped by person**. If they’re on the Google Form CSV, their notes appear; if not, the heading is **Photos from [name]** using the name parsed from the filename. **Video files are not kept in the repo** (they break Vercel’s serverless size limit); use Dropbox or YouTube for clips if needed.

## Update the content

### Automatic (every 6 hours)

GitHub Actions runs **Sync form submissions from Google Sheet** on a schedule. It always fetches the [public CSV export](https://docs.google.com/spreadsheets/d/1GYhHVkTpQtcXTEMUFjQHCs0DgRfA-VS8dFhuCDRB7Dw/export?format=csv&gid=253822378) into `data/memories/submissions.csv`. If you add a **repository secret** `DROPBOX_ACCESS_TOKEN` (Dropbox app token with `files.content.read`), the same job also downloads images from the shared album into `public/memories/`, runs **`npm run optimize:memories`**, then **`npm run build:memories-data`** (writes **`public/memories-payload.json`** and **`lib/heroCarouselManifest.generated.ts`**), and commits when anything changes. The sheet tab must be **viewable by anyone with the link** (or published) so the export URL works without the Sheets API.

- **Manual run:** GitHub → Actions → that workflow → **Run workflow**.
- **Override URLs:** Actions **Variables** → `GOOGLE_SHEET_CSV_URL` and/or `DROPBOX_SHARED_FOLDER_URL` (optional; the repo default folder URL matches the current shared album link).
- **Dropbox token:** Actions **Secrets** → `DROPBOX_ACCESS_TOKEN`. Omit it to keep CI sheet-only (no photo sync in CI). Dropbox short-lived tokens expire; refresh the secret when downloads start failing with 401.

If new form rows or Dropbox photos are missing on the site, check **GitHub → Actions → Sync form submissions** for failed runs. The job must be allowed to **push to `main`** (repo **Settings → Actions → General → Workflow permissions: Read and write**). A green run with “No changes” means the sheet export, `public/memories-payload.json`, `lib/heroCarouselManifest.generated.ts`, and `public/memories/` already matched what CI pulled.

### Manual

1. Replace **`data/memories/submissions.csv`** with a fresh export from the Google Sheet (same columns: timestamp, name, message), or run **`npm run sync:memories`** locally (uses `GOOGLE_SHEET_CSV_URL` from `.env.local` or the default Sheet URL in `scripts/sync-memories.ts`).
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
