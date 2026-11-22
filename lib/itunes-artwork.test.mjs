import test from "node:test";
import assert from "node:assert/strict";
import { findItunesArtwork } from "./itunes-artwork.js";

const artworkUrl = "https://is1-ssl.mzstatic.com/image/thumb/example/100x100bb.jpg";

function searchResults(results, onFetch = () => {}) {
  return async (url) => {
    onFetch(url);
    return { ok: true, json: async () => ({ results }) };
  };
}

test("selects only matching title and artist and expands the artwork", async () => {
  let requestedUrl;
  const fetchImpl = searchResults(
    [
      { trackName: "Other Song", artistName: "The Artist", artworkUrl100: artworkUrl },
      { trackName: "Song!", artistName: "The Artist", artworkUrl100: artworkUrl },
    ],
    (url) => { requestedUrl = url; },
  );
  const result = await findItunesArtwork("song", "the artist", { fetchImpl, cache: new Map() });
  assert.equal(result, artworkUrl.replace("100x100bb", "600x600bb"));
  assert.equal(new URL(requestedUrl).searchParams.get("term"), "song the artist");
});

test("accepts the Studio artist within a longer iTunes artist credit", async () => {
  const fetchImpl = searchResults([
    {
      trackName: "Can't Hold Us (feat. Ray Dalton)",
      artistName: "Macklemore & Ryan Lewis",
      collectionName: "The Heist",
      artworkUrl100: artworkUrl,
    },
  ]);
  assert.equal(
    await findItunesArtwork("Can't Hold Us (feat. Ray Dalton)", "Macklemore", {
      fetchImpl,
      cache: new Map(),
    }),
    artworkUrl.replace("100x100bb", "600x600bb"),
  );
});

test("does not match an artist name inside another word", async () => {
  const fetchImpl = searchResults([
    { trackName: "Song", artistName: "Joanne", artworkUrl100: artworkUrl },
  ]);
  assert.equal(await findItunesArtwork("Song", "Ann", { fetchImpl, cache: new Map() }), null);
});

test("rejects a different artist or title and never reuses the prior cover", async () => {
  const cache = new Map();
  const matching = searchResults([
    { trackName: "First Song", artistName: "Singer", artworkUrl100: artworkUrl },
  ]);
  assert.ok(await findItunesArtwork("First Song", "Singer", { fetchImpl: matching, cache }));
  const wrongSong = searchResults([
    { trackName: "First Song", artistName: "Singer", artworkUrl100: artworkUrl },
    { trackName: "Second Song", artistName: "The Band", artworkUrl100: artworkUrl },
  ]);
  assert.equal(await findItunesArtwork("Second Song", "Singer", { fetchImpl: wrongSong, cache }), null);
});

test("skips iTunes when the artist is missing", async () => {
  let calls = 0;
  const result = await findItunesArtwork("Song", "", {
    fetchImpl: searchResults([], () => { calls++; }),
    cache: new Map(),
  });
  assert.equal(result, null);
  assert.equal(calls, 0);
});

test("rejects missing or untrusted artwork URLs", async () => {
  const fetchImpl = searchResults([
    { trackName: "Song", artistName: "Singer" },
    { trackName: "Song", artistName: "Singer", artworkUrl100: "https://example.com/100x100bb.jpg" },
  ]);
  assert.equal(await findItunesArtwork("Song", "Singer", { fetchImpl, cache: new Map() }), null);
});

test("caches a repeated song lookup", async () => {
  let calls = 0;
  const cache = new Map();
  const fetchImpl = searchResults([
    { trackName: "Song", artistName: "Singer", artworkUrl100: artworkUrl },
  ], () => { calls++; });
  await findItunesArtwork("Song", "Singer", { fetchImpl, cache });
  await findItunesArtwork("SONG!", "singer", { fetchImpl, cache });
  assert.equal(calls, 1);
});

test("falls back when iTunes fails or exceeds the time limit", async () => {
  const failed = async () => { throw new Error("network error"); };
  assert.equal(await findItunesArtwork("Song", "Singer", { fetchImpl: failed, cache: new Map() }), null);

  let aborted = false;
  const stalled = (_, { signal }) => new Promise(() => {
    signal.addEventListener("abort", () => { aborted = true; });
  });
  assert.equal(
    await findItunesArtwork("Song", "Singer", { fetchImpl: stalled, cache: new Map(), timeoutMs: 10 }),
    null,
  );
  assert.equal(aborted, true);
});
