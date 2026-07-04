import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
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

// GET - ambil session yang ada
export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession(cookieStore, SESSION_OPTIONS);

    if (!session.sessionId) {
      return NextResponse.json({ session: null, limit: REQUEST_LIMIT });
    }

    const guestSession = await prisma.guestSession.findUnique({
      where: { sessionId: session.sessionId },
    });

    if (!guestSession || guestSession.expiresAt < new Date()) {
      return NextResponse.json({ session: null, limit: REQUEST_LIMIT });
    }

    return NextResponse.json({
      session: {
        guestName: guestSession.guestName,
        requestCount: guestSession.requestCount,
        sessionId: guestSession.sessionId,
      },
      limit: REQUEST_LIMIT,
    });
  } catch (error) {
    console.error("GET guest session error:", error);
    return NextResponse.json({ session: null, limit: REQUEST_LIMIT });
  }
}

// POST - buat session baru
export async function POST(req) {
  try {
    const { guestName } = await req.json();

    if (!guestName || guestName.trim().length < 2 || guestName.trim().length > 30) {
      return NextResponse.json(
        { error: "Nama panggilan harus 2-30 karakter" },
        { status: 400 }
      );
    }

    // Ambil stream config untuk broadcastId & expiry
    const streamConfig = await prisma.streamConfig.findFirst();
    if (!streamConfig?.onAir) {
      return NextResponse.json(
        { error: "Siaran sedang tidak live" },
        { status: 403 }
      );
    }

    const sessionId = nanoid(21);
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 jam

    const guestSession = await prisma.guestSession.create({
      data: {
        sessionId,
        guestName: guestName.trim(),
        broadcastId: streamConfig.id,
        expiresAt,
      },
    });

    // Simpan ke iron-session cookie
    const cookieStore = await cookies();
    const ironSession = await getIronSession(cookieStore, SESSION_OPTIONS);
    ironSession.sessionId = sessionId;
    await ironSession.save();

    return NextResponse.json({
      session: {
        guestName: guestSession.guestName,
        requestCount: guestSession.requestCount,
        sessionId: guestSession.sessionId,
      },
      limit: REQUEST_LIMIT,
    });
  } catch (error) {
    console.error("POST guest session error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}