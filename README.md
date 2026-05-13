# LeRoy — memories

A simple Next.js site: **photos** from `public/memories/` are **grouped by person**. If they’re on the Google Form CSV, their notes appear; if not, the heading is **Photos from [name]** using the name parsed from the filename. **Video files are not kept in the repo** (they break Vercel’s serverless size limit); use Dropbox or YouTube for clips if needed.

## Update the content

### Automatic (every 6 hours)

GitHub Actions runs **Sync form submissions from Google Sheet** on a schedule. It always fetches the [public CSV export](https://docs.google.com/spreadsheets/d/1GYhHVkTpQtcXTEMUFjQHCs0DgRfA-VS8dFhuCDRB7Dw/export?format=csv&gid=253822378) into `data/memories/submissions.csv`. If you add a **repository secret** `DROPBOX_ACCESS_TOKEN` (Dropbox app token with `files.content.read`), the same job also downloads images from the shared album into `public/memories/`, runs **`npm run optimize:memories`**, then **`npm run build:memories-data`** (writes `data/memories/payload.json` for the API), and commits when anything changes. The sheet tab must be **viewable by anyone with the link** (or published) so the export URL works without the Sheets API.

- **Manual run:** GitHub → Actions → that workflow → **Run workflow**.
- **Override URLs:** Actions **Variables** → `GOOGLE_SHEET_CSV_URL` and/or `DROPBOX_SHARED_FOLDER_URL` (optional; the repo default folder URL matches the current shared album link).
- **Dropbox token:** Actions **Secrets** → `DROPBOX_ACCESS_TOKEN`. Omit it to keep CI sheet-only (no photo sync in CI). Dropbox short-lived tokens expire; refresh the secret when downloads start failing with 401.

If new form rows or Dropbox photos are missing on the site, check **GitHub → Actions → Sync form submissions** for failed runs. The job must be allowed to **push to `main`** (repo **Settings → Actions → General → Workflow permissions: Read and write**). A green run with “No changes” means the sheet export, `data/memories/payload.json`, and `public/memories/` already matched what CI pulled.

### Manual

1. Replace **`data/memories/submissions.csv`** with a fresh export from the Google Sheet (same columns: timestamp, name, message), or run **`npm run sync:memories`** locally (uses `GOOGLE_SHEET_CSV_URL` from `.env.local` or the default Sheet URL in `scripts/sync-memories.ts`).
2. Add or replace **image** files in **`public/memories/`** (JPEG/PNG/WebP, etc.). Filenames like `IMG_1234 Millie Wibert.jpeg` work well—the site strips camera/UUID prefixes and matches the **last two words** to **“First and Last Name”** on the form (with fuzzy matching, e.g. Millicent ↔ Millie when the last name matches).

Optional: **`npm run sync:memories`** also downloads from the Dropbox folder when `DROPBOX_ACCESS_TOKEN` is set in `.env.local` (see `.env.example`). After a pull, run **`npm run optimize:memories`**, then **`npm run build:memories-data`** so `data/memories/payload.json` matches the folder before you commit.

### Keeping the site light

- **Build-time data:** `npm run build` (and `npm run dev`) regenerate **`data/memories/payload.json`** from the CSV + image filenames. **`/api/memories`** serves only that JSON so Vercel does not pack every photo into the serverless function (which hit the ~300MB limit before). Images stay in **`public/memories/`** as static files.
- **Thumbnails:** Carousel tiles use Next.js `Image` with `quality={75}` and `sizes` capped to the viewport width of the carousel (see `app/components/LeroyMemories.tsx`).
- **Full-screen view:** The lightbox uses a plain `<img>` on the optimized static JPEG/PNG.
- **Repo size / Vercel:** Only **images** live under `public/memories/`. **Do not commit `.mp4` / `.mov`** — they are gitignored. Large binaries in the API bundle were the main cause of deploy failures; the JSON payload avoids that.
- **Link preview:** `public/og.jpg` (1200×630) is regenerated when you run **`npm run optimize:memories`** from `leroy-hero.jpeg`. Set **`NEXT_PUBLIC_SITE_URL`** to your production URL so shared links resolve images correctly (see `.env.example`).
- **Hero carousel:** `public/leroy-hero.jpeg` plus any images in **`public/hero-carousel/`** (e.g. family “Dad” album) appear as swipeable photos at the top of the page.

## Run locally

```bash
npm install
npm run dev
```

## Deploy (Vercel)

Import the repo and deploy. No environment variables are required if CSV and media are committed.

## Scripts

- `npm run build:memories-data` — scan CSV + `public/memories/`, write `data/memories/payload.json` (run automatically before `dev` / `build`)  
- `npm run dev` — regenerates payload, then dev server  
- `npm run build` — regenerates payload, then production build  
- `npm run lint` — ESLint  
- `npm run sync:memories` — fetch sheet CSV; optional Dropbox download when token is set  
- `npm run optimize:memories` — resize / recompress `public/memories/`, `public/hero-carousel/`, `public/leroy-hero.jpeg`, and write `public/og.jpg` for social previews  
