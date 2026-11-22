// GET /api/studio/link-status?sid=<loginAttempt>
// Login baru hanya dapat disetujui untuk sid yang dibuat pada klik tersebut.
// GET /api/studio/link-status?dev=<deviceId> tetap untuk sinkronisasi sesi lama.
// Return:
//   { status: "pending" }                     — menunggu persetujuan kru
//   { status: "approved", token, scope, ... } — siap; token dipakai app
//   { status: "denied" }                      — ditolak
//   { status: "revoked" }                      — device pernah aktif, kini dicabut
//   { status: "notfound" }                    — belum ada permintaan link

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveStudioLinkStatus } from "@/lib/studio-link-status";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const deviceId = params.get("dev") || "";
  const sid = params.get("sid") || "";
  if (!deviceId && !sid) {
    return NextResponse.json({ error: "dev atau sid wajib" }, { status: 400, headers: noStore });
  }

  const result = await resolveStudioLinkStatus(prisma, { sid, deviceId });
  return NextResponse.json(result, { headers: noStore });
}
