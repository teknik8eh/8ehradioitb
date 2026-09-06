import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";

  if (q.length < 2) {
    return NextResponse.json({ items: [] });
  }

  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=10`;
    const res = await fetch(itunesUrl);

    if (!res.ok) {
      return NextResponse.json(
        { error: "Pencarian gagal. Coba lagi nanti." },
        { status: 502 },
      );
    }

    const data = await res.json();

    const items = (data.results || []).map((r) => ({
      trackId: String(r.trackId),
      title: r.trackName,
      artist: r.artistName,
      album: r.collectionName || null,
      artworkUrl: r.artworkUrl100
        ? r.artworkUrl100.replace("100x100", "600x600")
        : null,
      previewUrl: r.previewUrl || null,
      genre: r.primaryGenreName || null,
      durationMs: r.trackTimeMillis || null,
    }));

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json(
      { error: "Pencarian gagal. Coba lagi nanti." },
      { status: 502 },
    );
  }
}
