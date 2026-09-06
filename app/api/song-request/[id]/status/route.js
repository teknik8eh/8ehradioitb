import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
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

    const current = await prisma.songRequest.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: "Request tidak ditemukan" }, { status: 404 });
    }

    // Jika NOW_PLAYING, pastikan hanya 1 yang playing dalam broadcast yang sama.
    if (status === "NOW_PLAYING") {
      await prisma.songRequest.updateMany({
        where: {
          broadcastId: current.broadcastId,
          status: "NOW_PLAYING",
          id: { not: id },
        },
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

    return NextResponse.json({ success: true, request: updated });
  } catch (error) {
    console.error("PATCH song-request status error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
