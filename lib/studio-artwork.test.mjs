import test from "node:test";
import assert from "node:assert/strict";
import { chooseStudioCover, decodeStudioArtwork, MAX_STUDIO_ARTWORK_BYTES, studioArtworkKeyFromUrl } from "./studio-artwork.js";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0xff, 0xd9]);
const payload = (bytes, mimeType = "image/jpeg") => ({ mimeType, data: bytes.toString("base64") });

test("accepts bounded image bytes and rejects wrong MIME or invalid bytes", () => {
  assert.deepEqual(decodeStudioArtwork(payload(jpeg)).bytes, jpeg);
  assert.equal(decodeStudioArtwork(payload(jpeg, "image/png")), null);
  assert.equal(decodeStudioArtwork(payload(Buffer.from("not a JPEG"))), null);
  assert.equal(decodeStudioArtwork({ mimeType: "image/jpeg", data: "!!!!" }), null);
  assert.equal(decodeStudioArtwork(payload(Buffer.alloc(MAX_STUDIO_ARTWORK_BYTES + 1))), null);
});

test("only accepts Studio-owned R2 keys for cleanup", () => {
  assert.equal(studioArtworkKeyFromUrl("/api/proxy-audio?key=studio-covers%2F2026-11-22%2Fcover.jpg"), "studio-covers/2026-11-22/cover.jpg");
  assert.equal(studioArtworkKeyFromUrl("https://example.com/cover.jpg"), null);
  assert.equal(studioArtworkKeyFromUrl("/api/proxy-audio?key=podcast%2Fcover.jpg"), null);
  assert.equal(studioArtworkKeyFromUrl("/api/proxy-audio?key=studio-covers%2F..%2Fcover.jpg"), null);
});

test("prefers supplied artwork and falls back to lookup if storage fails", async () => {
  const lookup = async () => "https://example.com/itunes.jpg";
  assert.equal(await chooseStudioCover(payload(jpeg), "Song", "Artist", {
    store: async () => "/api/proxy-audio?key=studio-covers%2Fcover.jpg",
    lookup,
  }), "/api/proxy-audio?key=studio-covers%2Fcover.jpg");
  assert.equal(await chooseStudioCover(payload(jpeg), "Song", "Artist", {
    store: async () => { throw new Error("R2 unavailable"); },
    lookup,
  }), "https://example.com/itunes.jpg");
  assert.equal(await chooseStudioCover(null, "Song", "Artist", { lookup }), "https://example.com/itunes.jpg");
});
