import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ roomId: string }>;
}

/**
 * GET /api/live-chat/[roomId]/stats
 * Auth: Public
 *
 * CATATAN PERUBAHAN dari versi sebelumnya: implementasi awal saya menghitung
 * "koneksi aktif" lewat event bus in-memory SSE. Karena sekarang broadcast
 * pakai Pusher (bukan SSE buatan sendiri), kita tidak punya akses langsung
 * ke jumlah subscriber channel dari sisi server tanpa fitur tambahan Pusher
 * (Presence Channels — butuh setup channel type berbeda, authEndpoint, dst).
 *
 * Untuk sekarang, endpoint ini mengembalikan jumlah pesan total di room dan
 * status room. Kalau Anda butuh "jumlah listener aktif" yang akurat, opsinya:
 *   1. Upgrade channel Pusher ke Presence Channel (butuh endpoint auth
 *      tambahan /api/live-chat/pusher-auth) — Pusher native expose
 *      presence:subscription_count via webhook atau pusher.get('/channels/...').
 *   2. Pakai pusher.get() REST API untuk query jumlah subscriber channel biasa
 *      (channel non-presence tetap punya subscription_count via Pusher Channels
 *      info API kalau diaktifkan di dashboard Pusher).
 * Beri tahu saya kalau mau saya implementasikan salah satu dari ini.
 */
export async function GET(_req: Request, { params }: RouteParams) {
  const { roomId } = await params;

  const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
  if (!room) {
    return NextResponse.json({ error: "Room tidak ditemukan" }, { status: 404 });
  }

  const messageCount = await prisma.chatMessage.count({ where: { roomId, isDeleted: false } });

  // Query guest sessions yang belum expired dan terikat ke broadcastId yang sama
  const activeSessions = await prisma.guestSession.findMany({
    where: {
      broadcastId: room.broadcastId,
      expiresAt: { gt: new Date() },
    },
    select: {
      sessionId: true,
      guestName: true,
      isMuted: true,
    },
  });

  return NextResponse.json({
    roomId,
    isActive: room.isActive,
    messageCount,
    activeListeners: activeSessions.length,
    activeGuests: activeSessions.map((s) => ({
      sessionId: s.sessionId,
      name: s.guestName,
      isMuted: s.isMuted,
    })),
  });
}
