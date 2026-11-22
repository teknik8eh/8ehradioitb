/**
 * Helper konversi key R2 -> URL media publik.
 *
 * DB tetap menyimpan key R2 bersih (mis. "podcasts/123_audio.mp3").
 * Konversi ke URL penuh (https://assets.8ehradioitb.com/<key>) terjadi
 * di sini, sehingga media besar (audio) tidak lagi melalui API route
 * proxy yang berisiko cache poisoning di CDN edge.
 */

const R2_ASSETS_BASE_URL =
  process.env.NEXT_PUBLIC_R2_ASSETS_URL || "https://assets.8ehradioitb.com";

/**
 * Cek apakah value sudah berupa URL absolut (http/https)
 */
export function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

/**
 * Konversi key R2 / path lokal / URL menjadi URL yang bisa dipakai
 * langsung oleh browser.
 *
 * - "" / null / undefined        -> ""
 * - URL absolut (http(s)://...)  -> dipakai apa adanya
 * - Path lokal (diawali "/")     -> dipakai apa adanya (mis. "/8eh-real.svg")
 *   Termasuk path proxy lama ("/api/proxy-audio?key=...") yang tersimpan
 *   di DB lama - tetap valid, hanya tidak lagi lewat R2 assets.
 * - Key R2 ("podcasts/xxx.mp3")  -> `${R2_ASSETS_BASE_URL}/${key}`
 */
export function getMediaUrl(key) {
  if (!key) return "";
  if (isHttpUrl(key)) return key;
  if (key.startsWith("/")) return key;
  return `${R2_ASSETS_BASE_URL}/${key}`;
}
