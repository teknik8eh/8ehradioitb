// lib/session.js
// Guest session berbasis iron-session (cookie terenkripsi).
// Dipakai untuk identifikasi pendengar anonim di Live Chat & Song Request.
// Terpisah dari next-auth (admin/penyiar).
//
// Cookie berisi: { sessionId, guestName }
// DB GuestSession menyimpan metadata tambahan (mute, requestCount, broadcastId).
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export const GUEST_SESSION_COOKIE = "8eh_guest";

const SESSION_OPTIONS = {
  cookieName: GUEST_SESSION_COOKIE,
  password: process.env.GUEST_SESSION_SECRET,
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // secure: true di production (https). Vercel selalu https di prod.
    secure: process.env.NODE_ENV === "production",
  },
  ttl: 60 * 60 * 12, // 12 jam default TTL cookie (override oleh expiresAt DB)
};

function assertSecret() {
  if (
    !process.env.GUEST_SESSION_SECRET ||
    process.env.GUEST_SESSION_SECRET.length < 32
  ) {
    console.warn(
      "[session] GUEST_SESSION_SECRET belum diset atau kurang dari 32 karakter. " +
        "Guest session tidak akan berfungsi optimal.",
    );
  }
}

/**
 * Ambil (atau buat kosong) iron-session untuk request saat ini.
 */
export async function getGuestSession() {
  assertSecret();
  const cookieStore = await cookies();
  const session = await getIronSession(cookieStore, SESSION_OPTIONS);
  return session;
}

/**
 * Simpan data guest ke session cookie.
 * @param {{ sessionId: string, guestName: string }} data
 */
export async function saveGuestSession(data) {
  const session = await getGuestSession();
  session.sessionId = data.sessionId;
  session.guestName = data.guestName;
  await session.save();
  return session;
}

/**
 * Hapus guest session cookie (logout guest).
 */
export async function destroyGuestSession() {
  const session = await getGuestSession();
  session.destroy();
}

/**
 * Baca sessionId dari cookie tanpa throw. Return null bila tidak ada.
 */
export async function getGuestSessionId() {
  const session = await getGuestSession();
  return session?.sessionId || null;
}
