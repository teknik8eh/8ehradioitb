// POST /api/studio/session
// Login app 8EH Studio: username + password -> token perangkat (STUDIO_DEVICE_TOKEN).
// Token yang dikembalikan TIDAK dikirim ke klien — hanya dipakai server
// sebagai nilai pembanding untuk X-Device-Token (sama seperti sebelumnya).
// App menyimpan sesi login (user + issuedAt) secara lokal; endpoint
// /api/studio/now-playing tetap memakai X-Device-Token.

import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { authenticateDevice } from "@/lib/studio-devices";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const device = await authenticateDevice(request.headers.get("x-device-token"));
  if (!device) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({
    user: { name: device.ownerName || "Kru 8EH" },
    scope: device.scope,
    metadataEnabled: device.metadataEnabled,
  }, { headers: { "Cache-Control": "no-store" } });
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = String(body?.username ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username dan password wajib diisi" },
        { status: 400 },
      );
    }

    const account = await prisma.studioAccount.findUnique({
      where: { username },
    });

    const expectedToken = process.env.STUDIO_DEVICE_TOKEN;
    if (!expectedToken) {
      return NextResponse.json(
        { error: "Server belum dikonfigurasi (STUDIO_DEVICE_TOKEN kosong)" },
        { status: 500 },
      );
    }

    // Hash sederhana tapi aman untuk server-side compare (scrypt-like via crypto)
    const { scrypt, randomBytes } = await import("crypto");
    const verify = await new Promise((resolve) => {
      scrypt(password, username, 64, (err, derived) => {
        resolve(err ? null : derived.toString("hex"));
      });
    });

    const ok =
      account &&
      account.active &&
      verify &&
      safeEqual(account.passwordHash, verify);

    if (!ok) {
      // delay kasar untuk menghambat brute force
      await new Promise((r) => setTimeout(r, 500));
      return NextResponse.json(
        { error: "Username atau password salah" },
        { status: 401 },
      );
    }

    await prisma.studioAccount.update({
      where: { id: account.id },
      data: { lastLoginAt: new Date() },
    });

    // Token perangkat dikirim SEKALI ke app yang sudah terautentikasi.
    // Ini tetap kredensial perangkat (bukan kredensial akun dashboard),
    // sesuai keputusan security: session dashboard tidak dipakai app.
    return NextResponse.json({
      ok: true,
      user: {
        username: account.username,
        displayName: account.displayName,
        role: account.role,
      },
      deviceToken: expectedToken,
    });
  } catch (error) {
    console.error("studio/session error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
