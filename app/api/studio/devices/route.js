// API perangkat 8EH Studio (device link + manajemen dashboard).
//
// GET    /api/studio/devices            — (session TECHNIC/DEV) daftar device
// POST   /api/studio/devices            — CLAIM dari app: { deviceId, deviceName }
//                                          body dengan secret → return token + scope
// PATCH  /api/studio/devices            — (session) { id, metadataEnabled?, active? }
// PUT    /api/studio/devices            — (session) { action: "select"|"clearSelection", id? }
// DELETE /api/studio/devices?id=...      — (session) revoke device
//
// Catatan alur:
//   App membuka /studio-link?dev=<deviceId>&name=<deviceName> di browser.
//   Kru login Google (NextAuth) → halaman memanggil POST /api/studio/link-session
//   untuk membuat "link request" menunggu persetujuan → kru klik Setujui →
//   halaman memanggil POST /api/studio/devices dengan sid link request.
//   App mem-polling GET /api/studio/link-status?sid=... sampai approved.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { hasAnyRole } from "@/lib/roleUtils";

const ADMIN_ROLES = ["DEVELOPER", "TECHNIC"];
const MAX_TEXT = 120;

function cleanText(value) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_TEXT);
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasAnyRole(session.user.role, ADMIN_ROLES)) {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const devices = await prisma.studioDevice.findMany({
    orderBy: { createdAt: "desc" },
  });
  const state = await prisma.nowPlayingState.findUnique({
    where: { key: "main" },
    select: { activeDeviceId: true },
  });
  return NextResponse.json({ devices, activeDeviceId: state?.activeDeviceId ?? null });
}

export async function PATCH(request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const id = cleanText(body?.id);
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const data = {};
  if (typeof body?.metadataEnabled === "boolean") {
    data.metadataEnabled = body.metadataEnabled;
  }
  if (typeof body?.active === "boolean") {
    data.active = body.active;
  }
  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "tidak ada perubahan" }, { status: 400 });
  }
  const device = await prisma.studioDevice.update({ where: { id }, data });
  return NextResponse.json({ device });
}

export async function PUT(request) {
  // pilih / batal pilih device metadata aktif (dashboard)
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const action = cleanText(body?.action);

  if (action === "select") {
    const id = cleanText(body?.id);
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const device = await prisma.studioDevice.findUnique({ where: { id } });
    if (!device) {
      return NextResponse.json({ error: "Device tidak ditemukan" }, { status: 404 });
    }
    const state = await prisma.nowPlayingState.upsert({
      where: { key: "main" },
      update: { activeDeviceId: device.deviceId },
      create: { key: "main", activeDeviceId: device.deviceId },
    });
    return NextResponse.json({ activeDeviceId: state.activeDeviceId });
  }

  if (action === "clearSelection") {
    await prisma.nowPlayingState.updateMany({
      where: { key: "main" },
      data: { activeDeviceId: null },
    });
    return NextResponse.json({ activeDeviceId: null });
  }

  return NextResponse.json({ error: "action tidak dikenal" }, { status: 400 });
}

export async function DELETE(request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const device = await prisma.studioDevice.delete({ where: { id } }).catch(() => null);
  if (!device) {
    return NextResponse.json({ error: "Device tidak diamukan" }, { status: 404 });
  }
  // kalau device yang dihapus adalah active, clear juga pilihan
  const state = await prisma.nowPlayingState.findUnique({
    where: { key: "main" },
    select: { activeDeviceId: true },
  });
  if (state?.activeDeviceId === device.deviceId) {
    await prisma.nowPlayingState.updateMany({
      where: { key: "main" },
      data: { activeDeviceId: null },
    });
  }
  return NextResponse.json({ ok: true });
}
