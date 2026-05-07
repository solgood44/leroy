# LeRoy — memories & music

A [Next.js](https://nextjs.org) site for LeRoy Harvey: music, community links, photos, and family memories. Ready to deploy on [Vercel](https://vercel.com).

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Photos & form messages (bundled data)

The **Photos & messages** section reads **only local files**—nothing is fetched from Dropbox or Google at request time:

- **`data/memories/submissions.csv`** — Google Form responses (exported as CSV)
- **`public/memories/`** — images (served as static files)

Name matching is unchanged: image **filenames** are compared to **“First and Last Name”** on the form.

### Refreshing from Dropbox + Google Sheet

When you want to pull the latest sheet and album from the cloud:

```bash
npm run sync:memories
```

This always re-downloads the CSV into `data/memories/submissions.csv`.  
If **`DROPBOX_ACCESS_TOKEN`** is set in `.env.local` (see `.env.example`), it also **clears `public/memories/`** (except hidden files like `.gitkeep`) and re-downloads every image from the shared folder (recursive).

Then **commit** the updated CSV and images and deploy so Vercel serves the new bundle.

**Vercel:** You do **not** need Dropbox or Google env vars on the server anymore—only the committed files matter at runtime.

## Deploy to Vercel

1. Push this repo to GitHub (includes `data/memories/` and `public/memories/`).
2. Import the repo in [Vercel](https://vercel.com/new).
3. Use default Next.js settings (`next build`). No secrets required for the live site.

## Project layout

- `app/components/LeroySite.tsx` — main page and section navigation
- `app/components/MemoryGallery.tsx` — gallery UI
- `app/api/memories/route.ts` — serves JSON built from local CSV + images
- `lib/memories.ts`, `lib/sheet.ts`, `lib/nameMatch.ts` — parsing and matching
- `lib/dropbox.ts` — used only by `npm run sync:memories`
- `scripts/sync-memories.ts` — download script
- `data/memories/submissions.csv` — form export (committed)
- `public/memories/` — photos (committed after sync)
- `legacy-static/` — earlier static HTML/CSS for reference

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — run production build locally
- `npm run lint` — ESLint
- `npm run sync:memories` — refresh CSV (and photos if Dropbox token is set)
