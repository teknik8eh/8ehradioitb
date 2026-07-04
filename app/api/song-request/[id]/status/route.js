import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { hasAnyRole } from "@/lib/roleUtils";

function isAdmin(roleString) {
  return hasAnyRole(roleString, ["DEVELOPER", "TECHNIC", "MUSIC"]);
}

// PATCH /api/song-request/[id]/status
export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { status, rejectedReason } = await req.json();

    const validStatuses = ["PENDING", "QUEUED", "NOW_PLAYING", "DONE", "REJECTED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    }

    // Jika NOW_PLAYING, pastikan hanya 1 yang playing
    if (status === "NOW_PLAYING") {
      await prisma.songRequest.updateMany({
        where: { status: "NOW_PLAYING" },
        data: { status: "QUEUED" },
      });
    }

    const updated = await prisma.songRequest.update({
      where: { id },
      data: {
        status,
        rejectedReason: status === "REJECTED" ? (rejectedReason || null) : null,
      },
    });

    // Trigger Pusher
    try {
      if (process.env.PUSHER_APP_ID) {
        const Pusher = (await import("pusher")).default;
        const pusher = new Pusher({
          appId: process.env.PUSHER_APP_ID,
          key: process.env.PUSHER_KEY,
          secret: process.env.PUSHER_SECRET,
          cluster: process.env.PUSHER_CLUSTER,
          useTLS: true,
        });
        const streamConfig = await prisma.streamConfig.findFirst();
        if (streamConfig) {
          await pusher.trigger(
            `broadcast-${streamConfig.id}`,
            "song-request-updated",
            { request: updated }
          );
        }
      }
    } catch (pusherError) {
      console.error("Pusher error (non-fatal):", pusherError);
    }

    return NextResponse.json({ success: true, request: updated });
  } catch (error) {
    console.error("PATCH song-request status error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}