import { createHash } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const MAX_STUDIO_ARTWORK_BYTES = 512 * 1024;
const COVER_PREFIX = "studio-covers/";
const IMAGE_TYPES = {
  "image/jpeg": { extension: "jpg", matches: (data) => data.length > 4 && data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) && data.subarray(-2).equals(Buffer.from([0xff, 0xd9])) },
  "image/png": { extension: "png", matches: (data) => data.length >= 24 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) && data.subarray(12, 16).toString() === "IHDR" && data.readUInt32BE(16) > 0 && data.readUInt32BE(20) > 0 },
  "image/webp": { extension: "webp", matches: (data) => data.length >= 16 && data.subarray(0, 4).toString() === "RIFF" && data.subarray(8, 12).toString() === "WEBP" && data.readUInt32LE(4) + 8 === data.length },
};

export function decodeStudioArtwork(artwork) {
  if (!artwork || typeof artwork !== "object") return null;
  const type = IMAGE_TYPES[artwork.mimeType];
  if (!type || typeof artwork.data !== "string") return null;
  const encoded = artwork.data;
  if (!encoded || encoded.length > Math.ceil(MAX_STUDIO_ARTWORK_BYTES / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) return null;
  const bytes = Buffer.from(encoded, "base64");
  if (!bytes.length || bytes.length > MAX_STUDIO_ARTWORK_BYTES || !type.matches(bytes)) return null;
  return { bytes, mimeType: artwork.mimeType, extension: type.extension };
}

function storage() {
  const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) return null;
  return {
    bucket: R2_BUCKET,
    client: new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    }),
  };
}

export function studioArtworkKeyFromUrl(url) {
  if (typeof url !== "string" || !url.startsWith("/api/proxy-audio?")) return null;
  const key = new URL(url, "https://studio.invalid").searchParams.get("key");
  return key?.startsWith(COVER_PREFIX) && !key.includes("..") ? key : null;
}

export async function storeStudioArtwork(artwork) {
  const decoded = decodeStudioArtwork(artwork);
  const target = storage();
  if (!decoded || !target) return null;
  const hash = createHash("sha256").update(decoded.bytes).digest("hex");
  const date = new Date().toISOString().slice(0, 10);
  const key = `${COVER_PREFIX}${date}/${hash}.${decoded.extension}`;
  await target.client.send(new PutObjectCommand({
    Bucket: target.bucket,
    Key: key,
    Body: decoded.bytes,
    ContentType: decoded.mimeType,
    CacheControl: "public, max-age=31536000, immutable",
  }));
  return `/api/proxy-audio?key=${encodeURIComponent(key)}`;
}

export async function chooseStudioCover(artwork, title, artist, {
  store = storeStudioArtwork,
  lookup,
} = {}) {
  if (artwork) {
    try {
      const cover = await store(artwork);
      if (cover) return cover;
    } catch (error) {
      console.warn("Failed to store Studio cover; using artwork lookup:", error);
    }
  }
  return lookup(title, artist);
}

export async function deleteSupersededStudioArtwork(oldUrl, currentUrl) {
  const oldKey = studioArtworkKeyFromUrl(oldUrl);
  if (!oldKey || oldUrl === currentUrl) return;
  const target = storage();
  if (!target) return;
  await target.client.send(new DeleteObjectCommand({ Bucket: target.bucket, Key: oldKey }));
}
