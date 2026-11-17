// GET /api/studio/link-status?dev=<deviceId>
// Dipanggil APP 8EH Studio (polling) tanpa session — keamanan lewat deviceId
// rahasia (48-hex, dibuat app dan tidak dibagikan).
// Return:
//   { status: "pending" }                     — menunggu persetujuan kru
//   { status: "approved", token, scope, ... } — siap; token dipakai app
//   { status: "denied" }                      — ditolak
//   { status: "revoked" }                      — device pernah aktif, kini dicabut
//   { status: "notfound" }                    — belum ada permintaan link

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const deviceId = params.get("dev") || "";
  if (!deviceId) {
    return NextResponse.json({ error: "dev wajib" }, { status: 400 });
  }

  const link = await prisma.studioDeviceLink.findUnique({ where: { deviceId } });
  if (!link) {
    // mungkin sudah pernah disetujui sebelumnya — cek device
    const existing = await prisma.studioDevice.findUnique({ where: { deviceId } });
    if (existing) {
      if (!existing.active) return NextResponse.json({ status: "revoked" });
      return NextResponse.json({
        status: "approved",
        token: existing.token,
        scope: existing.scope,
        metadataEnabled: existing.metadataEnabled,
        user: { name: existing.ownerName },
      });
    }
    return NextResponse.json({ status: "notfound" });
  }

  if (link.status === "approved") {
    const device = await prisma.studioDevice.findUnique({
      where: { deviceId },
    });
    if (!device || !device.active) {
      return NextResponse.json({ status: "revoked" });
    }
    return NextResponse.json({
      status: "approved",
      token: device.token,
      scope: device.scope,
      metadataEnabled: device.metadataEnabled,
      user: { name: device.ownerName },
    });
  }

  return NextResponse.json({ status: link.status || "pending" });
}
