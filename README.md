# LeRoy — memories

A simple Next.js site: **photos and videos** from `public/memories/` are **grouped by person** and shown with their **full Google Form submission(s)** in `data/memories/submissions.csv`, when filenames match the name they used on the form.

## Update the content

1. Replace **`data/memories/submissions.csv`** with a fresh export from the Google Sheet (same columns: timestamp, name, message).
2. Add or replace files in **`public/memories/`**. Filenames like `IMG_1234 Millie Wibert.jpeg` or `… Kurstin Shalawylo.mov` work well—the site strips camera/UUID prefixes and matches the **last two words** to **“First and Last Name”** on the form (with fuzzy matching, e.g. Millicent ↔ Millie when the last name matches).

Optional: **`npm run sync:memories`** still pulls the default Sheet + Dropbox folder if you use a Dropbox token in `.env.local` (see `.env.example`).

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
