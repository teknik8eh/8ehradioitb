import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBroadcast } from "@/lib/broadcast";
import { serializeSongRequest } from "../_shared";

export async function GET() {
  const broadcast = await getActiveBroadcast();
  if (!broadcast) {
    return NextResponse.json({ queue: [], nowPlaying: null });
  }

  const requests = await prisma.songRequest.findMany({
    where: {
      broadcastId: broadcast.id,
      status: { in: ["QUEUED", "NOW_PLAYING"] },
    },
    orderBy: { createdAt: "asc" },
  });

  const nowPlayingItem = requests.find((r) => r.status === "NOW_PLAYING") || null;
  const queue = requests.filter((r) => r.status === "QUEUED");

  return NextResponse.json({
    queue: queue.map(serializeSongRequest),
    nowPlaying: nowPlayingItem ? serializeSongRequest(nowPlayingItem) : null,
  });
}
