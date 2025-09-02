# Sackboy Studio

A Next.js app that transforms your photo into a **knitted burlap plush craft** aesthetic using OpenAI image‑to‑image. Add a caption client‑side and download as PNG.

## Features

- Upload PNG/JPG/WebP (max 8 MB)
- Style Strength (low/medium/high)
- Optional crafted diorama background
- Client‑side caption overlay with outline, draggable, snap guides
- Download PNG; optional shareable link via Vercel Blob (opt‑in)
- Privacy‑first (no storage by default)

## Quickstart

```bash
npm i
cp ...env ..env # put OPENAI_API_KEY
npm run dev
```

Open `http://localhost:3000` and upload an image.

## Env

- `OPENAI_API_KEY` – required
- `STORAGE_MODE` – `none` (default) or `blob`
- `BLOB_READ_WRITE_TOKEN` – required if `STORAGE_MODE=blob`

## Testing

- Unit: `npm test`
- E2E: `npm run test:e2e` (start dev server first)

## Deploy to Vercel

1. Push repo to GitHub
2. Import into Vercel
3. Set env vars
4. Deploy
