import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionIdFromCookie } from "@/lib/live-chat/auth";
import { getOrSyncActiveRoom } from "@/lib/live-chat/room";

export async function GET() {
  try {
    const sessionId = await getSessionIdFromCookie();

    if (!sessionId) {
      return NextResponse.json({ requests: [] });
    }

    const guestSession = await prisma.guestSession.findUnique({
      where: { sessionId },
    });

    if (!guestSession) {
      return NextResponse.json({ requests: [] });
    }

    const room = await getOrSyncActiveRoom();
    if (!room?.broadcastId || guestSession.broadcastId !== room.broadcastId) {
      return NextResponse.json({ requests: [] });
    }

    const requests = await prisma.songRequest.findMany({
      where: { sessionId: guestSession.id, broadcastId: room.broadcastId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        songTitle: true,
        songArtist: true,
        status: true,
        rejectedReason: true,
      },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("GET my-requests error:", error);
    return NextResponse.json({ requests: [] });
  }
}
