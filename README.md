# LeRoy — memories & music

A [Next.js](https://nextjs.org) site for LeRoy Harvey: music, community links, photos, and family memories. Ready to deploy on [Vercel](https://vercel.com).

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env.local` and add a Dropbox token (see below) if you want the **Photos & messages** section to load images from the shared album.

## Photos + Google Form matching

The **Photos & messages** section combines:

1. **Google Form responses** — fetched from a public CSV export of your spreadsheet (no API key). The sheet must allow **Anyone with the link → Viewer** so the export URL works.
2. **Dropbox album** — the app lists image files in your shared folder using the Dropbox API and builds short-lived direct image links.

When a photo’s **filename** is close to someone’s **“First and Last Name”** on the form, their message is shown next to that photo. Names are matched in a fuzzy way (e.g. `Millie Wibert.jpg` matches “Millie Wibert”). Messages that never match a filename appear under **Messages without a matched photo**.

Defaults for the CSV URL and Dropbox folder are set in `lib/memories.ts`; you can override them with environment variables.

### Dropbox access token (Vercel / `.env.local`)

1. Open the [Dropbox App Console](https://www.dropbox.com/developers/apps) and **Create app**.
2. Choose **Scoped access**, give it a name, and pick the **Full Dropbox** (or an app folder that can see the shared content — for shared links from your account, Full Dropbox is simplest).
3. Under **Permissions**, enable **files.metadata.read** and **files.content.read**, then **Submit**.
4. On the app’s **Settings** tab, under **OAuth 2**, generate an **access token** for your Dropbox account and copy it.
5. Set **`DROPBOX_ACCESS_TOKEN`** in Vercel (Project → Settings → Environment Variables) or in `.env.local`.

Dropbox access tokens expire depending on how they were issued. If images stop loading, generate a new token and update the env var.

Optional:

- **`GOOGLE_SHEET_CSV_URL`** — full export URL (`…/export?format=csv&gid=…`) if you change sheets.
- **`DROPBOX_SHARED_FOLDER_URL`** — the Dropbox folder share link if you move the album.

Data is cached on the server for about **5 minutes** (`/api/memories`).

## Deploy to Vercel

1. Push this repo to GitHub.
2. In [Vercel](https://vercel.com/new), import the repository.
3. Add **`DROPBOX_ACCESS_TOKEN`** (and optional overrides) in the project’s environment variables.
4. Deploy with the default Next.js settings (`next build`).

## Project layout

- `app/components/LeroySite.tsx` — main page and section navigation
- `app/components/MemoryGallery.tsx` — Dropbox + Sheet UI
- `app/api/memories/route.ts` — aggregates photos and form rows
- `lib/memories.ts`, `lib/sheet.ts`, `lib/dropbox.ts`, `lib/nameMatch.ts` — matching and providers
- `app/globals.css` — typography and section themes
- `legacy-static/` — earlier static HTML/CSS for reference

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — run production build locally
- `npm run lint` — ESLint
