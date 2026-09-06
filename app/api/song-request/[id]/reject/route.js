import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { triggerSongRequestEvent } from "@/lib/pusher";
import { serializeSongRequest } from "../../_shared";

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const reason = body.reason?.trim() || null;

  if (reason && reason.length > 500) {
    return NextResponse.json(
      { error: "Alasan maksimal 500 karakter." },
      { status: 400 },
    );
  }

  const songRequest = await prisma.songRequest.findUnique({ where: { id } });
  if (!songRequest) {
    return NextResponse.json({ error: "Request tidak ditemukan." }, { status: 404 });
  }

  if (!["PENDING", "QUEUED"].includes(songRequest.status)) {
    return NextResponse.json(
      { error: "Tidak bisa menolak request dengan status ini." },
      { status: 400 },
    );
  }

  const updated = await prisma.songRequest.update({
    where: { id },
    data: { status: "REJECTED", rejectedReason: reason },
  });

  await triggerSongRequestEvent(songRequest.broadcastId, {
    name: "queue-updated",
    data: JSON.stringify({ requestId: id, status: "REJECTED" }),
  });

  return NextResponse.json({ request: serializeSongRequest(updated) });
}
