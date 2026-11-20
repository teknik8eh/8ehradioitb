// Helper autentikasi perangkat 8EH Studio (device link via Google).
// Dipakai oleh:
//   - /api/studio/session    (login username/password, scope dari StudioAccount)
//   - /api/studio/now-playing (auth X-Device-Token)
//   - /api/studio/devices/*  (device link polling, pilih device aktif, dst.)
//
// Dua jalur token:
//   1. Token global (STUDIO_DEVICE_TOKEN) — kompatibilitas lama (dev/test).
//   2. Token per-device (StudioDevice.token) — hasil login; membawa scope:
//      "broadcast" = siaran + metadata, "metadata" = hanya metadata.

import { randomBytes } from "crypto";

export function generateDeviceId() {
  return randomBytes(24).toString("hex");
}

export function generateDeviceToken() {
  return randomBytes(24).toString("hex");
}

/** Scope yang diizinkan untuk role situs (string role dipisah "-"). */
export function scopeForRoles(roleString) {
  const has = (r) =>
    String(roleString || "")
      .split("-")
      .filter(Boolean)
      .includes(r);
  if (has("DEVELOPER") || has("TECHNIC")) return "broadcast";
  if (has("MUSIC")) return "metadata";
  return null; // role lain: tolak
}

/** Cari device berdasarkan token; return device atau null. Update lastSeenAt. */
export async function authenticateDevice(token) {
  if (!token) return null;
  const { prisma } = await import("@/lib/prisma");
  const device = await prisma.studioDevice.findUnique({
    where: { token },
  });
  if (!device || !device.active) return null;
  await prisma.studioDevice
    .update({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
    })
    .catch(() => {});
  return device;
}

/**
 * Gate aksi device terhadap NowPlayingState.activeDeviceId.
 * - activeDeviceId null  → semua device metadataEnabled boleh menulis.
 * - activeDeviceId diset → HANYA device itu yang boleh menulis metadata.
 * Return { allowed, reason }.
 */
export async function checkMetadataOwnership(deviceId) {
  const { prisma } = await import("@/lib/prisma");
  const state = await prisma.nowPlayingState.findUnique({
    where: { key: "main" },
    select: { activeDeviceId: true },
  });
  const activeId = state?.activeDeviceId;
  if (!activeId) return { allowed: true };
  if (activeId === deviceId) return { allowed: true };
  return {
    allowed: false,
    reason: "device-not-selected",
  };
}
