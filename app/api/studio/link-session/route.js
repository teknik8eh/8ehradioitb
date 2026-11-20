// Link flow app 8EH Studio — dua endpoint:
//
// POST /api/studio/link-session
//   Dipanggil halaman /studio-link SETELAH kru login Google.
//   Body: { deviceId, deviceName } → buat link request (pending).
//   Return: { sid } — sid dipakai halaman untuk persetujuan,
//   dan dipakai APP untuk polling status (GET /api/studio/link-status).
//
// PUT /api/studio/link-session
//   Dipanggil halaman saat kru klik "Setujui" (atau "Tolak").
//   Body: { sid, approve: true|false }
//   Jika setujui: buat/update StudioDevice dengan token baru, scope sesuai role,
//   tandai link request approved. App polling link-status akan menerima token.

import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { scopeForRoles, generateDeviceToken } from "@/lib/studio-devices";

export const dynamic = "force-dynamic";

const MAX_TEXT = 120;
const PENDING_TTL_MS = 10 * 60 * 1000; // link request hangus 10 menit

function cleanText(value) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_TEXT);
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Login dulu" }, { status: 401 });
  }
  const scope = scopeForRoles(session.user.role);
  if (!scope) {
    return NextResponse.json(
      { error: "Role kamu tidak diizinkan memakai 8EH Studio" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const deviceId = cleanText(body?.deviceId);
  const deviceName = cleanText(body?.deviceName) || "Perangkat Studio";
  if (!deviceId) {
    return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  }

  const sid = cleanText(body?.sid) || randomBytes(16).toString("hex");
  if (!/^[0-9a-f]{32}$/.test(sid)) {
    return NextResponse.json({ error: "sid tidak valid" }, { status: 400 });
  }
  await prisma.studioDeviceLink.upsert({
    where: { deviceId },
    update: {
      sid,
      deviceName,
      ownerName: session.user.name || session.user.email || null,
      scope,
      status: "pending",
      createdAt: new Date(),
    },
    create: {
      deviceId,
      sid,
      deviceName,
      ownerName: session.user.name || session.user.email || null,
      scope,
      status: "pending",
    },
  });

  return NextResponse.json({
    sid,
    scope,
    user: {
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
    },
  });
}

export async function PUT(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Login dulu" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const sid = cleanText(body?.sid);
  const approve = body?.approve === true;
  if (!sid) {
    return NextResponse.json({ error: "sid required" }, { status: 400 });
  }

  const link = await prisma.studioDeviceLink.findUnique({ where: { sid } });
  if (!link) {
    return NextResponse.json({ error: "Link request tidak ditemukan" }, { status: 404 });
  }
  const ageMs = Date.now() - new Date(link.createdAt).getTime();
  if (ageMs > PENDING_TTL_MS || link.status !== "pending") {
    return NextResponse.json({ error: "Link request basi" }, { status: 410 });
  }

  if (!approve) {
    await prisma.studioDeviceLink.update({
      where: { sid },
      data: { status: "denied" },
    });
    return NextResponse.json({ status: "denied" });
  }

  // Setujui: buat/update device dengan token baru
  const token = generateDeviceToken();
  const device = await prisma.studioDevice.upsert({
    where: { deviceId: link.deviceId },
    update: {
      token,
      deviceName: link.deviceName,
      ownerName: link.ownerName,
      scope: link.scope,
      active: true,
      metadataEnabled: true,
      lastSeenAt: new Date(),
    },
    create: {
      deviceId: link.deviceId,
      token,
      deviceName: link.deviceName,
      ownerName: link.ownerName,
      scope: link.scope,
      active: true,
      metadataEnabled: true,
      lastSeenAt: new Date(),
    },
  });

  await prisma.studioDeviceLink.update({
    where: { sid },
    data: { status: "approved", deviceId: link.deviceId },
  });

  return NextResponse.json({ status: "approved", scope: device.scope });
}
