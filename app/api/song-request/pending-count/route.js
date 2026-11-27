import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getActiveRoomOrNull } from "@/lib/live-chat/room";
import { prisma } from "@/lib/prisma";
import { hasAnyRole } from "@/lib/roleUtils";
import { SONG_REQUEST_ADMIN_ROLES } from "@/lib/song-request-admin";

export const dynamic = "force-dynamic";

function countResponse(count) {
  return NextResponse.json({ count }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!hasAnyRole(session?.user?.role, SONG_REQUEST_ADMIN_ROLES)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await prisma.streamConfig.findFirst({ select: { onAir: true } });
    if (!config?.onAir) return countResponse(0);

    const room = await getActiveRoomOrNull();
    if (!room?.broadcastId) return countResponse(0);

    const count = await prisma.songRequest.count({
      where: { broadcastId: room.broadcastId, status: "PENDING" },
    });
    return countResponse(count);
  } catch (error) {
    console.error("Failed to count pending song requests:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
