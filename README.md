# LeRoy — memories & music

A [Next.js](https://nextjs.org) site for LeRoy Harvey: music, community links, photos, and family memories. Ready to deploy on [Vercel](https://vercel.com).

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push this repo to GitHub (`origin` should be `https://github.com/solgood44/leroy.git`).
2. In [Vercel](https://vercel.com/new), import the repository.
3. Use the default Next.js settings (build: `next build`, output: Next.js). No extra env vars are required.

## Project layout

- `app/components/LeroySite.tsx` — main page content and section navigation
- `app/globals.css` — typography and section themes (ported from the earlier static site)
- `legacy-static/` — previous `index.html` / `styles.css` for reference

### Adding gallery photos

1. Put images in `public/gallery/` (for example `public/gallery/molly-and-i.jpg`).
2. In `LeroySite.tsx`, replace a placeholder block with `next/image` or an `<img src="/gallery/..." alt="..." />`.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — run production build locally
- `npm run lint` — ESLint
