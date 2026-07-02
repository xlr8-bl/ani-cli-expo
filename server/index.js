/**
 * XLR8 Consumet source resolver.
 *
 * A tiny stateless server that wraps @consumet/extensions so the app can
 * resolve AniList episodes → playable streams in one fast request. It holds
 * zero user data — it only proxies scraping — so it doesn't break XLR8's
 * "the device is the account" model.
 *
 * Routes (Consumet-compatible):
 *   GET /health
 *   GET /meta/anilist/info/:anilistId?provider=zoro
 *   GET /meta/anilist/watch/:episodeId?provider=zoro&dub=false&server=
 *
 * Deploy: any long-running Node host (Render / Railway / Fly / a VPS).
 * Serverless (Vercel) is NOT recommended — the scrapers need persistent
 * connections and longer timeouts than serverless functions allow.
 */
const express = require('express');
const cors = require('cors');
const { META, ANIME } = require('@consumet/extensions');

const app = express();
app.use(cors());
app.set('etag', false);

const PORT = process.env.PORT || 3000;

// --- Provider selection ----------------------------------------------------
// "zoro" is kept as an alias for HiAnime for Consumet-client compatibility.
const PROVIDERS = {
  zoro: () => new ANIME.Hianime(),
  hianime: () => new ANIME.Hianime(),
  animepahe: () => new ANIME.AnimePahe(),
  animekai: () => new ANIME.AnimeKai(),
};

function anilistFor(providerName) {
  const factory = PROVIDERS[providerName] || PROVIDERS.zoro;
  return new META.Anilist(factory());
}

// --- Tiny in-memory TTL cache ---------------------------------------------
const cache = new Map();
function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}
function cacheSet(key, value, ttlMs) {
  cache.set(key, { value, expires: Date.now() + ttlMs });
  if (cache.size > 2000) cache.delete(cache.keys().next().value);
}

// --- Routes ----------------------------------------------------------------
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/', (_req, res) => res.json({ name: 'xlr8-consumet-server', ok: true }));

app.get('/meta/anilist/info/:id', async (req, res) => {
  const { id } = req.params;
  const provider = String(req.query.provider || 'zoro');
  const key = `info:${provider}:${id}`;
  try {
    const cached = cacheGet(key);
    if (cached) return res.json(cached);
    const data = await anilistFor(provider).fetchAnimeInfo(id);
    cacheSet(key, data, 1000 * 60 * 30); // 30 min
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'info_failed', message: String(err && err.message) });
  }
});

app.get('/meta/anilist/watch/:episodeId(*)', async (req, res) => {
  const episodeId = req.params.episodeId;
  const provider = String(req.query.provider || 'zoro');
  const server = req.query.server ? String(req.query.server) : undefined;
  const dub = String(req.query.dub || '') === 'true';
  const key = `watch:${provider}:${dub}:${server || ''}:${episodeId}`;
  try {
    const cached = cacheGet(key);
    if (cached) return res.json(cached);
    const anilist = anilistFor(provider);
    // Signature varies slightly by provider; pass what's supported.
    const data = await anilist.fetchEpisodeSources(episodeId, server, dub ? 'dub' : 'sub');
    cacheSet(key, data, 1000 * 60 * 3); // 3 min — stream tokens expire
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'watch_failed', message: String(err && err.message) });
  }
});

app.listen(PORT, () => {
  console.log(`xlr8-consumet-server listening on :${PORT}`);
});
