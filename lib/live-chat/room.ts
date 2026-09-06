import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { broadcastRoomStatus } from "@/lib/live-chat/pusher";
import type { ChatRoom } from "@prisma/client";

/**
 * STRATEGI: lazy create/close, dipanggil di awal setiap request live-chat
 * (messages GET/POST, stats). Tidak ada hook di POST /api/stream-config —
 * lihat diskusi sebelumnya soal kenapa lazy-create dipilih dibanding edit
 * endpoint stream-config langsung.
 *
 * TRADE-OFF yang harus disadari: room close TIDAK instan saat onAir berubah
 * ke false — baru ke-detect & di-close di request live-chat BERIKUTNYA yang
 * masuk. Untuk kasus pakai chat siaran, delay ini biasanya cuma hitungan detik
 * (selama ada listener yang masih connect/fetch).
 */

/**
 * Ambil ChatRoom aktif kalau StreamConfig.onAir true, otherwise null.
 * Auto-create room baru kalau onAir true tapi belum ada room aktif.
 * Auto-close + archive room aktif kalau onAir sudah false.
 */
export async function getOrSyncActiveRoom(): Promise<ChatRoom | null> {
  const config = await prisma.streamConfig.findFirst();
  const onAir = config?.onAir ?? false;

  const activeRooms = await prisma.chatRoom.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  const [activeRoom, ...staleRooms] = activeRooms;

  if (staleRooms.length > 0) {
    await prisma.chatRoom.updateMany({
      where: { id: { in: staleRooms.map((room) => room.id) } },
      data: { isActive: false, closedAt: new Date() },
    });
    await Promise.all(
      staleRooms.map((room) =>
        broadcastRoomStatus(room.id, { roomId: room.id, isActive: false })
      )
    );
  }

  if (onAir) {
    if (activeRoom) return activeRoom;

    // Belum ada room aktif tapi siaran sedang live -> buat baru.
    // broadcastId di-generate sebagai ObjectId baru, tidak nyambung ke entity
    // broadcast manapun (sesuai keputusan) — murni identifier sesi siaran ini.
    // Prisma tidak auto-generate ObjectId untuk field selain `id`, jadi kita
    // generate manual pakai bson.ObjectId lalu convert ke string hex.
    const newRoom = await prisma.chatRoom.create({
      data: {
        isActive: true,
        broadcastId: randomBytes(12).toString("hex"),
      },
    });

    return newRoom;
  }

  // onAir false: kalau masih ada room aktif tertinggal, close + archive sekarang.
  if (activeRooms.length > 0) {
    await prisma.chatRoom.updateMany({
      where: { id: { in: activeRooms.map((room) => room.id) } },
      data: { isActive: false, closedAt: new Date() },
    });

    await Promise.all(
      activeRooms.map((room) =>
        broadcastRoomStatus(room.id, { roomId: room.id, isActive: false })
      )
    );

    return null;
  }

  return null;
}

/**
 * Versi read-only: cek room aktif TANPA side-effect (tidak create/close).
 * Berguna untuk endpoint yang cuma butuh tahu room mana yang aktif tanpa
 * trigger lazy-sync (misal dipanggil dua kali dalam satu request supaya
 * tidak query StreamConfig berulang).
 */
export async function getActiveRoomOrNull(): Promise<ChatRoom | null> {
  return prisma.chatRoom.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
}
