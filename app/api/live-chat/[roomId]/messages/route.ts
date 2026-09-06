import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireGuestSession } from "@/lib/live-chat/auth";
import { sanitizeMessageText } from "@/lib/live-chat/validate";
import { checkRateLimit } from "@/lib/live-chat/rate-limit";
import { broadcastNewMessage } from "@/lib/live-chat/pusher";
import { getActiveRoomOrNull } from "@/lib/live-chat/room";

interface RouteParams {
  params: Promise<{ roomId: string }>;
}

/**
 * GET /api/live-chat/[roomId]/messages
 * Auth: Guest Session Cookie
 *
 * Fetch history pesan. Pesan yang isDeleted=true TETAP dikembalikan tapi
 * dengan content diganti placeholder ("Pesan ini dihapus oleh moderator"),
 * bukan di-filter keluar — sesuai spek: tidak hilang dari DB, dan UI perlu
 * menampilkan placeholder itu di posisi pesan yang sama.
 *
 * Query params opsional: before (ISO date), limit (default 50, max 200)
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { roomId } = await params;

  const config = await prisma.streamConfig.findFirst();
  if (config?.liveChatEnabled === false) {
    return NextResponse.json({ error: "Live chat sedang dinonaktifkan" }, { status: 403 });
  }

  const guestCheck = await requireGuestSession();
  const adminCheck = guestCheck.ok ? null : await requireAdmin();
  if (!guestCheck.ok && !adminCheck?.ok) {
    const reason = (guestCheck as { ok: false; reason: string }).reason;
    return NextResponse.json({ error: "Sesi tidak valid", reason }, { status: reason === "muted" ? 403 : 401 });
  }

  const { searchParams } = new URL(req.url);
  const beforeParam = searchParams.get("before");
  const limitParam = Number(searchParams.get("limit") ?? 50);
  const limit = Math.min(Math.max(limitParam, 1), 200);

  const where: Record<string, unknown> = { roomId };
  if (beforeParam) {
    const beforeDate = new Date(beforeParam);
    if (!isNaN(beforeDate.getTime())) {
      where.createdAt = { lt: beforeDate };
    }
  }

  const messages = await prisma.chatMessage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  messages.reverse(); // kronologis lama -> baru

  return NextResponse.json({
    roomId,
    count: messages.length,
    messages: messages.map((m) => ({
      id: m.id,
      sessionId: m.sessionId,
      guestName: m.guestName,
      // Pesan terhapus: content diganti placeholder, content asli tetap utuh di DB
      content: m.isDeleted ? "Pesan ini dihapus oleh moderator" : m.content,
      isDeleted: m.isDeleted,
      createdAt: m.createdAt,
    })),
  });
}

/**
 * POST /api/live-chat/[roomId]/messages
 * Body: { content: string }
 * Auth: Guest Session Cookie
 *
 * - Maks 300 karakter
 * - Rate limit 10/menit per sessionId (DB-backed, lihat lib/rate-limit.ts)
 * - Cek room masih aktif (guest tidak bisa kirim kalau room tidak aktif)
 * - Broadcast realtime via Pusher
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { roomId } = await params;

  const config = await prisma.streamConfig.findFirst();
  if (config?.liveChatEnabled === false) {
    return NextResponse.json({ error: "Live chat sedang dinonaktifkan" }, { status: 403 });
  }

  const sessionCheck = await requireGuestSession();
  if (!sessionCheck.ok) {
    const reason = (sessionCheck as { ok: false; reason: string }).reason;
    const status = reason === "muted" ? 403 : 401;
    return NextResponse.json(
      {
        error:
          reason === "expired"
            ? "Sesi sudah expired, silakan masukkan nama panggilan lagi"
            : reason === "muted"
            ? "Anda sedang di-mute oleh admin"
            : "Sesi guest tidak ditemukan, silakan masukkan nama panggilan",
        reason,
      },
      { status }
    );
  }

  const { session } = sessionCheck;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body harus JSON valid" }, { status: 400 });
  }

  const content = sanitizeMessageText((body as Record<string, unknown>)?.content);
  if (!content) {
    return NextResponse.json({ error: "Pesan wajib diisi, maksimal 300 karakter" }, { status: 400 });
  }

  // Guest tidak bisa kirim pesan kalau room tidak aktif
  const activeRoom = await getActiveRoomOrNull();
  if (!activeRoom || activeRoom.id !== roomId) {
    return NextResponse.json({ error: "Room tidak aktif / siaran sudah selesai" }, { status: 409 });
  }

  if (session.broadcastId !== activeRoom.broadcastId) {
    return NextResponse.json({ error: "Sesi chat sudah berakhir, silakan masuk lagi" }, { status: 409 });
  }

  const rl = await checkRateLimit(session.sessionId);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: "Terlalu banyak pesan, coba lagi sebentar",
        retryAfterMs: rl.retryAfterMs,
      },
      {
        status: 429,
        headers: { "Retry-After": Math.ceil(rl.retryAfterMs / 1000).toString() },
      }
    );
  }

  const message = await prisma.chatMessage.create({
    data: {
      roomId,
      sessionId: session.id,
      guestName: session.guestName,
      content,
      isDeleted: false,
    },
  });

  const payload = {
    id: message.id,
    roomId,
    sessionId: session.sessionId,
    guestName: message.guestName,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };

  await broadcastNewMessage(roomId, payload);

  return NextResponse.json(payload, { status: 201 });
}
