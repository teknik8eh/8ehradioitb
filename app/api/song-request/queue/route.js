import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/song-request/queue - public, untuk panel antrian di website
export async function GET() {
  try {
    const [nowPlaying, queued] = await Promise.all([
      prisma.songRequest.findFirst({
        where: { status: "NOW_PLAYING" },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.songRequest.findMany({
        where: { status: "QUEUED" },
        orderBy: { updatedAt: "asc" },
      }),
    ]);

    return NextResponse.json({ nowPlaying, queued });
  } catch (error) {
    console.error("GET queue error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}