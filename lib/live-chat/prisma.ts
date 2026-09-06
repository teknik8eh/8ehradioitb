import { PrismaClient } from "@prisma/client";

/**
 * CATATAN: file ini ditulis ulang sebagai REFERENSI saja.
 * Kalau project Anda sudah punya lib/prisma.ts (dipakai di /api/stream-config),
 * JANGAN timpa file itu — pastikan isinya match pattern ini (singleton global),
 * lalu semua import `@/lib/prisma` di kode live-chat di bawah akan otomatis
 * pakai instance yang sama dengan modul lain di project Anda.
 */

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
