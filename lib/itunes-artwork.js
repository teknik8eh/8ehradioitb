const artworkCache = new Map();
const POSITIVE_TTL_MS = 24 * 60 * 60 * 1000;
const NEGATIVE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 256;

function normalizeMetadata(value) {
  return String(value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\p{M}/gu, "")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function artistMatches(itunesArtist, metadataArtist) {
  const normalizedItunesArtist = normalizeMetadata(itunesArtist);
  return (` ${normalizedItunesArtist} `).includes(` ${metadataArtist} `);
}

function artworkUrlFor(track) {
  if (typeof track?.artworkUrl100 !== "string") return null;
  try {
    const url = new URL(track.artworkUrl100);
    if (url.protocol !== "https:" || !/^is\d+-ssl\.mzstatic\.com$/i.test(url.hostname)) {
      return null;
    }
    return url.toString().replace("100x100bb", "600x600bb");
  } catch {
    return null;
  }
}

export async function findItunesArtwork(
  title,
  artist,
  { fetchImpl = fetch, cache = artworkCache, timeoutMs = 2000, now = Date.now } = {},
) {
  const normalizedTitle = normalizeMetadata(title);
  const normalizedArtist = normalizeMetadata(artist);
  if (!normalizedTitle || !normalizedArtist) return null;

  const key = `${normalizedTitle}\u0000${normalizedArtist}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now()) return cached.artworkUrl;
  if (cached) cache.delete(key);

  const query = `${title.trim()} ${artist.trim()}`;
  const apiUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=10`;
  const controller = new AbortController();
  let timer;
  try {
    const timedOut = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error("iTunes artwork lookup timed out"));
      }, timeoutMs);
    });
    const response = await Promise.race([
      fetchImpl(apiUrl, { signal: controller.signal }),
      timedOut,
    ]);
    if (!response.ok) return null;

    const data = await Promise.race([response.json(), timedOut]);
    if (!Array.isArray(data?.results)) return null;

    const matchingTrack = data.results.find(
      (track) =>
        normalizeMetadata(track.trackName) === normalizedTitle &&
        artistMatches(track.artistName, normalizedArtist) &&
        artworkUrlFor(track),
    );
    const artworkUrl = matchingTrack ? artworkUrlFor(matchingTrack) : null;
    cache.set(key, {
      artworkUrl,
      expiresAt: now() + (artworkUrl ? POSITIVE_TTL_MS : NEGATIVE_TTL_MS),
    });
    if (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
    return artworkUrl;
  } catch (error) {
    console.error("Failed to look up iTunes artwork:", error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
