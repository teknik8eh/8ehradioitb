import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/live-chat/auth";
import { broadcastGuestMuted } from "@/lib/live-chat/pusher";

interface RouteParams {
  params: Promise<{ roomId: string; sessionId: string }>;
}

/**
 * POST /api/live-chat/[roomId]/mute/[sessionId]
 * Auth: Admin only
 *
 * Set isMuted=true di GuestSession. Guest yang di-mute akan dapat error 403
 * saat coba kirim pesan (dicek di requireGuestSession, lib/auth.ts).
 * Audit trail: mutedById + mutedAt (lihat SCHEMA_CHANGES.md untuk field baru
 * yang perlu ditambahkan ke schema.prisma).
 *
 * `sessionId` di path ini adalah cookie value (field unik GuestSession.sessionId),
 * BUKAN GuestSession.id (ObjectId Mongo) — konsisten dengan cara guest
 * teridentifikasi di seluruh API ini.
 */
export async function POST(_req: Request, { params }: RouteParams) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) {
    const reason = (adminCheck as { ok: false; reason: string }).reason;
    return NextResponse.json(
      { error: "Akses ditolak, hanya admin" },
      { status: reason === "no_session" ? 401 : 403 }
    );
  }
  const { admin } = adminCheck;

  const isValidObjectId = (id: string) => /^[0-9a-f]{24}$/i.test(id);

  if (!isValidObjectId(admin.adminId)) {
    console.error(
      `[live-chat] admin.adminId ("${admin.adminId}") bukan ObjectId valid untuk mutedById.`
    );
    return NextResponse.json(
      { error: "Identitas admin tidak valid untuk operasi ini" },
      { status: 500 }
    );
  }

  const { roomId, sessionId } = await params;

  const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
  if (!room) {
    return NextResponse.json({ error: "Room tidak ditemukan" }, { status: 404 });
  }

  const guestSession = await prisma.guestSession.findUnique({ where: { sessionId } });
  if (!guestSession) {
    return NextResponse.json({ error: "Guest session tidak ditemukan" }, { status: 404 });
  }

  if (guestSession.broadcastId !== room.broadcastId) {
    return NextResponse.json({ error: "Guest session bukan milik room ini" }, { status: 409 });
  }

  if (guestSession.isMuted) {
    return NextResponse.json({ error: "Guest sudah di-mute sebelumnya" }, { status: 409 });
  }

  await prisma.guestSession.update({
    where: { sessionId },
    data: {
      isMuted: true,
      mutedById: admin.adminId,
      mutedAt: new Date(),
    },
  });

  await broadcastGuestMuted(roomId, { sessionId, isMuted: true });

  return NextResponse.json({ success: true, sessionId, isMuted: true });
}

/**
 * DELETE /api/live-chat/[roomId]/mute/[sessionId]
 * Auth: Admin only
 * Endpoint tambahan untuk unmute manual (di luar tabel spek awal, tapi
 * dibutuhkan secara natural sebagai pasangan dari POST mute).
 */
export async function DELETE(_req: Request, { params }: RouteParams) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) {
    const reason = (adminCheck as { ok: false; reason: string }).reason;
    return NextResponse.json(
      { error: "Akses ditolak, hanya admin" },
      { status: reason === "no_session" ? 401 : 403 }
    );
  }

  const { roomId, sessionId } = await params;

  const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
  if (!room) {
    return NextResponse.json({ error: "Room tidak ditemukan" }, { status: 404 });
  }

  const guestSession = await prisma.guestSession.findUnique({ where: { sessionId } });
  if (!guestSession) {
    return NextResponse.json({ error: "Guest session tidak ditemukan" }, { status: 404 });
  }

  if (guestSession.broadcastId !== room.broadcastId) {
    return NextResponse.json({ error: "Guest session bukan milik room ini" }, { status: 409 });
  }

  await prisma.guestSession.update({
    where: { sessionId },
    data: {
      isMuted: false,
      mutedById: null,
      mutedAt: null,
    },
  });

  await broadcastGuestMuted(roomId, { sessionId, isMuted: false });

  return NextResponse.json({ success: true, sessionId, isMuted: false });
}
