import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { getActiveBroadcast } from "@/lib/broadcast";
import { serializeSongRequest } from "../_shared";

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const broadcast = await getActiveBroadcast();
  if (!broadcast) {
    return NextResponse.json({ requests: [], broadcastId: null });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.trim();

  const where = { broadcastId: broadcast.id };

  if (status) {
    where.status = status.toUpperCase();
  }

  if (search) {
    where.OR = [
      { songTitle: { contains: search, mode: "insensitive" } },
      { songArtist: { contains: search, mode: "insensitive" } },
      { guestName: { contains: search, mode: "insensitive" } },
    ];
  }

  const requests = await prisma.songRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    requests: requests.map(serializeSongRequest),
    broadcastId: broadcast.id,
  });
}
