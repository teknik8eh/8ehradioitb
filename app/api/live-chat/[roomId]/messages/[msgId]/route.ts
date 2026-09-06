import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/live-chat/auth";
import { broadcastMessageDeleted } from "@/lib/live-chat/pusher";

interface RouteParams {
  params: Promise<{ roomId: string; msgId: string }>;
}

/**
 * DELETE /api/live-chat/[roomId]/messages/[msgId]
 * Auth: Admin only (NextAuth getServerSession + role check)
 *
 * Soft-delete: isDeleted=true, deletedById, deletedAt diisi. Content asli
 * TIDAK dihapus dari DB — UI menampilkan "Pesan ini dihapus oleh moderator"
 * (placeholder ini dipasang di layer response GET /messages, bukan di DB).
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
  const { admin } = adminCheck;

  // PENTING: ChatMessage.deletedById di schema adalah @db.ObjectId, jadi HARUS
  // ObjectId Mongo valid (24 hex char), bukan email/string bebas. Kalau
  // requireAdmin() di lib/auth.ts fallback ke session.user.email karena
  // session.user.id tidak ada, request ini akan ditolak di sini supaya tidak
  // menyebabkan Prisma error tidak jelas di tahap update.
  const isValidObjectId = (id: string) => /^[0-9a-f]{24}$/i.test(id);

  if (!isValidObjectId(admin.adminId)) {
    console.error(
      `[live-chat] admin.adminId ("${admin.adminId}") bukan ObjectId valid. ` +
        "Cek apakah session.user.id ter-populate dengan benar di NextAuth callback."
    );
    return NextResponse.json(
      { error: "Identitas admin tidak valid untuk operasi ini" },
      { status: 500 }
    );
  }

  const { roomId, msgId } = await params;

  const existing = await prisma.chatMessage.findUnique({ where: { id: msgId } });

  if (!existing || existing.roomId !== roomId) {
    return NextResponse.json({ error: "Pesan tidak ditemukan" }, { status: 404 });
  }

  if (existing.isDeleted) {
    return NextResponse.json({ error: "Pesan sudah terhapus sebelumnya" }, { status: 409 });
  }

  const now = new Date();

  await prisma.chatMessage.update({
    where: { id: msgId },
    data: {
      isDeleted: true,
      deletedById: admin.adminId,
      deletedAt: now,
    },
  });

  await broadcastMessageDeleted(roomId, { id: msgId, roomId, deletedAt: now.toISOString() });

  return NextResponse.json({ success: true, messageId: msgId, deletedAt: now });
}
