// app/api/live-chat/_shared.js
// Helper dipakai ulang antar route live-chat (bukan route itu sendiri).
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { hasAnyRole } from "@/lib/roleUtils";
import { prisma } from "@/lib/prisma";
import {
  getActiveBroadcast,
  isStreamOnAir,
  getOrCreateChatRoom,
} from "@/lib/broadcast";
import { getGuestSessionId } from "@/lib/session";

// Role yang boleh memoderasi chat: admin + penyiar
const MODERATOR_ROLES = ["DEVELOPER", "TECHNIC", "MUSIC", "REPORTER"];

/**
 * Validasi guest session dari cookie + cocokkan dengan DB.
 * Return { ok: true, guestSession } atau { ok: false, response }.
 *
 * Opsi:
 *   - requireOnAir (default true): 403 bila siaran offline
 *   - requireActiveRoom (default false): pastikan ada ChatRoom aktif & guest
 *     menempel ke broadcast aktif; return room juga
 */
export async function resolveGuest(options = {}) {
  const { requireOnAir = true, requireActiveRoom = false } = options;

  const sessionIdCookie = await getGuestSessionId();
  if (!sessionIdCookie) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Guest session tidak ditemukan. Silakan masuk dengan nama panggilan." },
        { status: 401 },
      ),
    };
  }

  const guestSession = await prisma.guestSession.findUnique({
    where: { sessionId: sessionIdCookie },
  });

  if (!guestSession) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Guest session tidak valid." },
        { status: 401 },
      ),
    };
  }

  // Session expire?
  if (guestSession.expiresAt && new Date(guestSession.expiresAt) < new Date()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Session kamu sudah berakhir. Silakan masuk lagi." },
        { status: 401 },
      ),
    };
  }

  if (requireOnAir) {
    const onAir = await isStreamOnAir();
    if (!onAir) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Siaran sedang offline." },
          { status: 403 },
        ),
      };
    }
  }

  let room = null;
  if (requireActiveRoom) {
    const broadcast = await getActiveBroadcast();
    if (!broadcast) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Tidak ada siaran aktif." },
          { status: 403 },
        ),
      };
    }
    if (guestSession.broadcastId && guestSession.broadcastId !== broadcast.id) {
      // Guest dari siaran lama — session sudah expire konseptual
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Session kamu untuk siaran sebelumnya. Silakan masuk lagi." },
          { status: 401 },
        ),
      };
    }
    room = await getOrCreateChatRoom(broadcast.id);
  }

  return { ok: true, guestSession, room };
}

/**
 * Validasi admin/penyiar (next-auth).
 */
export async function resolveAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || !hasAnyRole(session.user.role, MODERATOR_ROLES)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, user: session.user };
}

/**
 * Normalisasi keluaran ChatMessage untuk client.
 */
export function serializeMessage(msg) {
  return {
    id: msg.id,
    sessionId: msg.sessionId,
    guestName: msg.guestName,
    content: msg.content,
    isDeleted: msg.isDeleted,
    deletedById: msg.deletedById ?? null,
    deletedAt: msg.deletedAt ? msg.deletedAt.toISOString() : null,
    createdAt: msg.createdAt.toISOString(),
  };
}
