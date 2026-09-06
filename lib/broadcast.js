// lib/broadcast.js
// Helper siklus "satu sesi siaran" (Broadcast).
//
// Siklus:
//   - Admin set StreamConfig.onAir=true  → getOrCreateActiveBroadcast() buat/aktifkan
//   - Admin set StreamConfig.onAir=false → closeActiveBroadcast() tutup (+ tutup ChatRoom)
//
// Hanya boleh ada SATU Broadcast aktif pada satu waktu.
import { prisma } from "@/lib/prisma";

/**
 * Ambil Broadcast aktif saat ini (tanpa bikin baru).
 * Return null bila tidak ada.
 */
export async function getActiveBroadcast() {
  return prisma.broadcast.findFirst({
    where: { isActive: true },
    orderBy: { startedAt: "desc" },
  });
}

/**
 * Pastikan ada Broadcast aktif. Jika belum ada, buat baru.
 * Aman dipanggil berulang — tidak akan membuat duplikat.
 */
export async function getOrCreateActiveBroadcast() {
  const existing = await getActiveBroadcast();
  if (existing) return existing;

  return prisma.broadcast.create({
    data: {
      isActive: true,
      startedAt: new Date(),
    },
  });
}

/**
 * Tutup Broadcast aktif (jika ada): isActive=false, endedAt=now.
 * Sekaligus menutup semua ChatRoom aktif (isActive=false, closedAt=now)
 * dan men-expire GuestSession untuk siaran tersebut.
 */
export async function closeActiveBroadcast() {
  const active = await getActiveBroadcast();
  if (!active) return null;

  await prisma.$transaction([
    prisma.chatRoom.updateMany({
      where: { isActive: true, broadcastId: active.id },
      data: { isActive: false, closedAt: new Date() },
    }),
    prisma.guestSession.updateMany({
      where: { broadcastId: active.id },
      data: { expiresAt: new Date() },
    }),
    prisma.broadcast.update({
      where: { id: active.id },
      data: { isActive: false, endedAt: new Date() },
    }),
  ]);

  return active.id;
}

/**
 * Ambil ChatRoom aktif untuk broadcast tertentu.
 * Room dibuat on-demand saat guest pertama join.
 */
export async function getOrCreateChatRoom(broadcastId) {
  const existing = await prisma.chatRoom.findFirst({
    where: { broadcastId, isActive: true },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  return prisma.chatRoom.create({
    data: { broadcastId, isActive: true },
  });
}

/**
 * Cek apakah siaran sedang live berdasarkan StreamConfig.
 */
export async function isStreamOnAir() {
  const config = await prisma.streamConfig.findFirst();
  return Boolean(config?.onAir);
}
