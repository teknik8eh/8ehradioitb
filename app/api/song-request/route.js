import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { hasAnyRole } from "@/lib/roleUtils";
import { requireGuestSession } from "@/lib/live-chat/auth";
import { getOrSyncActiveRoom } from "@/lib/live-chat/room";

const REQUEST_LIMIT = parseInt(process.env.SONG_REQUEST_LIMIT_PER_SESSION || "3");
const SONG_REQUEST_ADMIN_ROLES = ["MUSIC", "DEVELOPER", "TECHNIC"];

function isSongRequestAdmin(roleString) {
  return hasAnyRole(roleString, SONG_REQUEST_ADMIN_ROLES);
}

function sanitizeSongMessage(message) {
  if (!message) return null;
  const cleaned = String(message).trim().replace(/<[^>]*>/g, "").replace(/[\x00-\x1F\x7F]/g, "");
  return cleaned ? cleaned.slice(0, 200) : null;
}

export async function POST(req) {
  try {
    const room = await getOrSyncActiveRoom();
    if (!room?.broadcastId) {
      return NextResponse.json(
        { error: "Siaran sedang tidak live" },
        { status: 403 }
      );
    }

    const config = await prisma.streamConfig.findFirst();
    if (config?.songRequestEnabled === false) {
      return NextResponse.json(
        { error: "Request lagu sedang dinonaktifkan" },
        { status: 403 }
      );
    }

    const guest = await requireGuestSession();
    if (!guest.ok) {
      return NextResponse.json(
        {
          error:
            guest.reason === "muted"
              ? "Kamu sedang di-mute dan tidak bisa request lagu."
              : "Session tidak valid. Masukkan nama panggilan terlebih dahulu.",
        },
        { status: guest.reason === "muted" ? 403 : 401 }
      );
    }

    const guestSession = guest.session;
    if (guestSession.broadcastId !== room.broadcastId) {
      return NextResponse.json(
        { error: "Session tidak berlaku untuk siaran ini. Masukkan nama panggilan lagi." },
        { status: 401 }
      );
    }

    if (guestSession.requestCount >= REQUEST_LIMIT) {
      return NextResponse.json(
        { error: "Kamu sudah mencapai batas request untuk siaran ini." },
        { status: 429 }
      );
    }

    const { songTitle, songArtist, songCoverUrl, itunesTrackId, message } = await req.json();
    const title = String(songTitle || "").trim();
    const artist = String(songArtist || "").trim();
    const cleanedMessage = sanitizeSongMessage(message);

    if (!title || !artist) {
      return NextResponse.json(
        { error: "Judul dan artis lagu wajib diisi." },
        { status: 400 }
      );
    }

    if (message && String(message).trim().length > 200) {
      return NextResponse.json(
        { error: "Pesan maksimal 200 karakter." },
        { status: 400 }
      );
    }

    const existing = await prisma.songRequest.findFirst({
      where: {
        broadcastId: room.broadcastId,
        songTitle: { equals: title, mode: "insensitive" },
        songArtist: { equals: artist, mode: "insensitive" },
        status: { not: "REJECTED" },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Lagu ini sudah ada dalam daftar request sesi ini." },
        { status: 409 }
      );
    }

    const songRequest = await prisma.songRequest.create({
      data: {
        sessionId: guestSession.id,
        guestName: guestSession.guestName,
        songTitle: title,
        songArtist: artist,
        songCoverUrl: songCoverUrl || null,
        itunesTrackId: itunesTrackId || null,
        message: cleanedMessage,
        broadcastId: room.broadcastId,
        status: "PENDING",
      },
    });

    await prisma.guestSession.update({
      where: { id: guestSession.id },
      data: { requestCount: { increment: 1 } },
    });

    return NextResponse.json({ success: true, request: songRequest });
  } catch (error) {
    console.error("POST song-request error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// GET - ambil semua request (untuk dashboard admin)
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search") || "";

  try {
    const session = await getServerSession(authOptions);
    if (!session || !isSongRequestAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const room = await getOrSyncActiveRoom();
    if (!room?.broadcastId) {
      return NextResponse.json({ requests: [], counts: { ALL: 0 } });
    }

    const where = { broadcastId: room.broadcastId };

    if (status && status !== "ALL") {
      where.status = status;
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

    // Hitung per status
    const counts = await prisma.songRequest.groupBy({
      by: ["status"],
      where: { broadcastId: room.broadcastId },
      _count: { status: true },
    });

    const countMap = { ALL: requests.length };
    counts.forEach((c) => {
      countMap[c.status] = c._count.status;
    });

    return NextResponse.json({ requests, counts: countMap });
  } catch (error) {
    console.error("GET song-request error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
