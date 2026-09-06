import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { hasAnyRole } from "@/lib/roleUtils";

function isMusic(roleString) {
  return hasAnyRole(roleString, ["MUSIC", "DEVELOPER"]);
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || !isMusic(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json(
        { error: "Missing search query" },
        { status: 400 },
      );
    }

    const apiUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=10`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to search iTunes" },
        { status: response.status },
      );
    }

    const data = await response.json();
    const results = Array.isArray(data?.results) ? data.results : null;

    if (!results) {
      console.error("Invalid iTunes response shape", { data });
      return NextResponse.json(
        { error: "Invalid iTunes response" },
        { status: 502 },
      );
    }

    const items = results
      .filter((t) => t.trackId != null && t.trackName && t.artistName)
      .map((track) => ({
        trackId: String(track.trackId),
        title: track.trackName,
        artist: track.artistName,
        album: track.collectionName,
        // Scale artwork to 600x600 for better quality
        artworkUrl: track.artworkUrl100
          ? track.artworkUrl100.replace("100x100bb", "600x600bb")
          : null,
        previewUrl: track.previewUrl || null,
        genre: track.primaryGenreName,
        durationMs: track.trackTimeMillis,
      }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error searching iTunes:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
