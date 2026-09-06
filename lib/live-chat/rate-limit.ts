import { prisma } from "@/lib/prisma";

/**
 * Rate limiter berbasis MongoDB (lewat Prisma), BUKAN in-memory.
 *
 * KENAPA DB-backed, bukan in-memory:
 * Project ini deploy di Vercel/serverless yang bisa auto-scale banyak instance/lambda.
 * In-memory Map per-proses tidak akan akurat karena setiap invocation bisa kena
 * instance berbeda dengan memory terpisah — satu sessionId bisa "lolos" limit
 * dengan kena instance yang masih kosong counternya.
 *
 * STRATEGI: fixed window 60 detik, disimpan di GuestSession.requestCount +
 * GuestSession.requestWindowStart (field requestWindowStart perlu ditambah ke
 * schema.prisma — lihat SCHEMA_CHANGES.md).
 *
 * CATATAN TRADE-OFF fixed window vs sliding window:
 * Fixed window lebih simpel (1 update query, atomic via Prisma), tapi punya
 * edge case klasik: kalau window baru mulai persis di detik ke-59, guest bisa
 * kirim 10 pesan di akhir window lama + 10 lagi di awal window baru (~20 pesan
 * dalam ~1-2 detik). Untuk live chat siaran radio/streaming, ini ditoleransi
 * demi simplicity & menghindari race condition dari sliding window di DB.
 * Kalau butuh presisi lebih ketat, ganti ke Redis sorted-set sliding window.
 */

const MAX_MESSAGES_PER_WINDOW = 10; // sesuai spek: maksimal 10 pesan per menit
const WINDOW_MS = 60_000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number; // 0 kalau allowed
}

export async function checkRateLimit(sessionId: string): Promise<RateLimitResult> {
  const now = new Date();

  const session = await prisma.guestSession.findUnique({
    where: { sessionId },
    select: { requestCount: true, requestWindowStart: true },
  });

  if (!session) {
    // Caller (route handler) seharusnya sudah validasi session ada sebelum panggil ini.
    // Kalau sampai sini berarti ada bug pemanggilan; treat sebagai not-allowed demi aman.
    return { allowed: false, remaining: 0, retryAfterMs: WINDOW_MS };
  }

  const windowStart = session.requestWindowStart;
  const windowExpired = !windowStart || now.getTime() - windowStart.getTime() >= WINDOW_MS;

  if (windowExpired) {
    // Window baru: reset counter ke 1 (request ini sendiri dihitung)
    await prisma.guestSession.update({
      where: { sessionId },
      data: { requestCount: 1, requestWindowStart: now },
    });
    return { allowed: true, remaining: MAX_MESSAGES_PER_WINDOW - 1, retryAfterMs: 0 };
  }

  // Masih dalam window yang sama
  if (session.requestCount >= MAX_MESSAGES_PER_WINDOW) {
    const retryAfterMs = WINDOW_MS - (now.getTime() - windowStart!.getTime());
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  await prisma.guestSession.update({
    where: { sessionId },
    data: { requestCount: { increment: 1 } },
  });

  return {
    allowed: true,
    remaining: MAX_MESSAGES_PER_WINDOW - (session.requestCount + 1),
    retryAfterMs: 0,
  };
}
