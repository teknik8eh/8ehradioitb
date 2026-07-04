import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

const SESSION_OPTIONS = {
  password: process.env.GUEST_SESSION_SECRET || "fallback-secret-min-32-chars-long!!",
  cookieName: "8eh_guest_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};

const REQUEST_LIMIT = parseInt(process.env.SONG_REQUEST_LIMIT_PER_SESSION || "3");

export async function POST(req) {
  try {
    // 1. Cek onAir
    const streamConfig = await prisma.streamConfig.findFirst();
    if (!streamConfig?.onAir) {
      return NextResponse.json(
        { error: "Siaran sedang tidak live" },
        { status: 403 }
      );
    }

    // 2. Ambil guest session dari cookie
    const cookieStore = await cookies();
    const ironSession = await getIronSession(cookieStore, SESSION_OPTIONS);

    if (!ironSession.sessionId) {
      return NextResponse.json(
        { error: "Session tidak ditemukan. Masukkan nama panggilan terlebih dahulu." },
        { status: 401 }
      );
    }

    const guestSession = await prisma.guestSession.findUnique({
      where: { sessionId: ironSession.sessionId },
    });

    if (!guestSession || guestSession.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Session tidak valid atau sudah expired." },
        { status: 401 }
      );
    }

    // 3. Cek limit request
    if (guestSession.requestCount >= REQUEST_LIMIT) {
      return NextResponse.json(
        { error: "Kamu sudah mencapai batas request untuk siaran ini." },
        { status: 429 }
      );
    }

    // 4. Parse payload
    const { songTitle, songArtist, songCoverUrl, itunesTrackId, message } = await req.json();

    if (!songTitle?.trim() || !songArtist?.trim()) {
      return NextResponse.json(
        { error: "Judul dan artis lagu wajib diisi." },
        { status: 400 }
      );
    }

    if (message && message.length > 200) {
      return NextResponse.json(
        { error: "Pesan maksimal 200 karakter." },
        { status: 400 }
      );
    }

    // 5. Cek duplikat dalam sesi ini
    const existing = await prisma.songRequest.findFirst({
      where: {
        broadcastId: streamConfig.id,
        songTitle: { equals: songTitle.trim(), mode: "insensitive" },
        songArtist: { equals: songArtist.trim(), mode: "insensitive" },
        status: { not: "REJECTED" },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Lagu ini sudah ada dalam daftar request sesi ini." },
        { status: 409 }
      );
    }

    // 6. Buat request
    const songRequest = await prisma.songRequest.create({
      data: {
        sessionId: guestSession.id,
        guestName: guestSession.guestName,
        songTitle: songTitle.trim(),
        songArtist: songArtist.trim(),
        songCoverUrl: songCoverUrl || null,
        itunesTrackId: itunesTrackId || null,
        message: message?.trim() || null,
        broadcastId: streamConfig.id,
        status: "PENDING",
      },
    });

    // 7. Update requestCount
    await prisma.guestSession.update({
      where: { id: guestSession.id },
      data: { requestCount: { increment: 1 } },
    });

    // 8. Trigger Pusher jika ada
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
        await pusher.trigger(
          `broadcast-${streamConfig.id}`,
          "song-request-new",
          { request: songRequest }
        );
      }
    } catch (pusherError) {
      console.error("Pusher error (non-fatal):", pusherError);
    }

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
    const where = {};

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