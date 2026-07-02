# XLR8 Consumet server

A tiny self-hosted source resolver for XLR8. It wraps
[`@consumet/extensions`](https://github.com/consumet/extensions) and exposes
just the two routes the app needs, turning an AniList episode into a playable
stream in one request. It stores **no user data** — it only proxies scraping.

## Why self-host?

`@consumet/extensions` is a Node **server** library (it uses `got-scraping`,
`cheerio`, etc.) and cannot run inside the mobile app. Public Consumet
instances are constantly rate-limited or offline. Running your own gives XLR8
fast, reliable, multi-provider sources that you control.

## Deploy (pick one — all free tiers work)

The server needs a **long-running** Node host. Do **not** use Vercel/Netlify
functions — the scrapers need persistent connections.

### Render (easiest)
1. Push this repo to GitHub (already done).
2. On [render.com](https://render.com): **New → Blueprint**, select this repo.
   Render reads `server/render.yaml` and deploys.
3. Copy the service URL, e.g. `https://xlr8-consumet.onrender.com`.

### Railway / Fly / any Docker host
- `server/Dockerfile` builds it anywhere. On Railway: New Project → Deploy from
  repo → set root directory to `server`.
- Fly: `cd server && fly launch` (uses the Dockerfile).

### Run locally
```bash
cd server
npm install
npm start        # http://localhost:3000
```

## Point the app at it

Set the base URL in the app (`src/config.ts` → `CONSUMET_BASE_URL`), then
republish (`eas update`). If it's left blank, XLR8 automatically falls back to
its built-in AllAnime scraper.

## Routes
- `GET /health` → `{ ok: true }`
- `GET /meta/anilist/info/:anilistId?provider=zoro`
- `GET /meta/anilist/watch/:episodeId?provider=zoro&dub=false`

Providers: `zoro` (HiAnime, default), `gogoanime`, `animepahe`.

## Keep-alive note
Render's free tier sleeps after 15 min idle, so the first request after idle is
slow (cold start). A free uptime pinger (e.g. cron-job.org hitting `/health`
every 10 min) keeps it warm.
