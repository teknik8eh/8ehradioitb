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

export async function GET() {
  try {
    const cookieStore = await cookies();
    const ironSession = await getIronSession(cookieStore, SESSION_OPTIONS);

    if (!ironSession.sessionId) {
      return NextResponse.json({ requests: [] });
    }

    const guestSession = await prisma.guestSession.findUnique({
      where: { sessionId: ironSession.sessionId },
    });

    if (!guestSession) {
      return NextResponse.json({ requests: [] });
    }

    const requests = await prisma.songRequest.findMany({
      where: { sessionId: guestSession.id },
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