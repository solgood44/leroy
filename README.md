# LeRoy — memories

A simple Next.js site: **photos and videos** from `public/memories/` are **grouped by person**. If they’re on the Google Form CSV, their notes appear; if not, the heading is **Photos from [name]** using the name parsed from the filename.

## Update the content

### Automatic (every 6 hours)

GitHub Actions runs **Sync form submissions from Google Sheet** on a schedule and commits `data/memories/submissions.csv` when the [public CSV export](https://docs.google.com/spreadsheets/d/1GYhHVkTpQtcXTEMUFjQHCs0DgRfA-VS8dFhuCDRB7Dw/export?format=csv&gid=253822378) changes (which triggers your usual deploy, e.g. Vercel). The sheet tab must be **viewable by anyone with the link** (or published) so the export URL works without the Sheets API.

- **Manual run:** GitHub → Actions → that workflow → **Run workflow**.
- **Override URL:** repo **Settings → Secrets and variables → Actions → Variables** → `GOOGLE_SHEET_CSV_URL` (optional).

If new form rows appear in the Sheet but **not on the site**, check **GitHub → Actions → Sync form submissions** for failed runs. The job must be allowed to **push to `main`** (repo **Settings → Actions → General → Workflow permissions: Read and write**). A green run with “No changes” means the export matched the repo file already.

### Manual

1. Replace **`data/memories/submissions.csv`** with a fresh export from the Google Sheet (same columns: timestamp, name, message), or run **`npm run sync:memories`** locally (uses `GOOGLE_SHEET_CSV_URL` from `.env.local` or the default Sheet URL in `scripts/sync-memories.ts`).
2. Add or replace files in **`public/memories/`**. Filenames like `IMG_1234 Millie Wibert.jpeg` or `… Kurstin Shalawylo.mov` work well—the site strips camera/UUID prefixes and matches the **last two words** to **“First and Last Name”** on the form (with fuzzy matching, e.g. Millicent ↔ Millie when the last name matches).

Optional: **`npm run sync:memories`** also downloads from the Dropbox folder when `DROPBOX_ACCESS_TOKEN` is set in `.env.local` (see `.env.example`).

## Run locally

```bash
npm install
npm run dev
```

## Deploy (Vercel)

Import the repo and deploy. No environment variables are required if CSV and media are committed.

## Scripts

- `npm run dev` — dev server  
- `npm run build` — production build  
- `npm run lint` — ESLint  
- `npm run sync:memories` — optional cloud refresh  
