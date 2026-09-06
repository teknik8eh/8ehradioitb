// lib/rateLimit.js
// Rate limiter in-memory sederhana per key (sessionId).
//
// ⚠️ LIMITATION: In-memory TIDAK shared antar serverless instance (Vercel).
//    Pada traffic tinggi / multiple instances, batas bisa longgar dari yang
//    diharapkan. Untuk produksi skala >100 concurrent user, upgrade ke
//    Redis/Upstash (@upstash/ratelimit). Untuk MVP & single-instance ini cukup.
const WINDOW_MS = 60_000; // 1 menit

// Map<key, number[]> — timestamp pesan dalam window
const hits = new Map();

/**
 * Hitung berapa pesan yang masih dalam window untuk key ini.
 */
function cleanOldTimestamps(arr, now) {
  const cutoff = now - WINDOW_MS;
  return arr.filter((t) => t > cutoff);
}

/**
 * Cek apakah key boleh melakukan aksi lagi.
 * @param {string} key - biasanya sessionId
 * @param {number} [limit] - override batas (default dari env)
 * @returns {{ allowed: boolean, remaining: number, retryAfterMs: number }}
 */
export function checkRateLimit(key, limit) {
  const max =
    limit ??
    Number(process.env.CHAT_RATE_LIMIT_PER_MINUTE ?? 10);
  const now = Date.now();

  const arr = cleanOldTimestamps(hits.get(key) ?? [], now);

  if (arr.length >= max) {
    // retry = waktu pesan tertua dalam window keluar dari window
    const oldest = arr[0];
    const retryAfterMs = Math.max(0, WINDOW_MS - (now - oldest));
    hits.set(key, arr);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  arr.push(now);
  hits.set(key, arr);
  return { allowed: true, remaining: max - arr.length, retryAfterMs: 0 };
}
