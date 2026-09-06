import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGuestSessionId } from "@/lib/session";
import { getActiveBroadcast, getOrCreateChatRoom } from "@/lib/broadcast";

export async function GET() {
  const sessionId = await getGuestSessionId();
  if (!sessionId) {
    return NextResponse.json({ active: false });
  }

  const guestSession = await prisma.guestSession.findUnique({
    where: { sessionId },
  });

  if (!guestSession) {
    return NextResponse.json({ active: false });
  }

  if (guestSession.expiresAt && new Date(guestSession.expiresAt) < new Date()) {
    return NextResponse.json({ active: false });
  }

  const broadcast = await getActiveBroadcast();
  if (!broadcast) {
    return NextResponse.json({ active: false });
  }

  if (guestSession.broadcastId && guestSession.broadcastId !== broadcast.id) {
    return NextResponse.json({ active: false });
  }

  const room = await getOrCreateChatRoom(broadcast.id);

  return NextResponse.json({
    active: true,
    session: {
      sessionId: guestSession.sessionId,
      guestSessionId: guestSession.id,
      guestName: guestSession.guestName,
      broadcastId: broadcast.id,
      roomId: room.id,
      requestCount: guestSession.requestCount,
    },
  });
}
