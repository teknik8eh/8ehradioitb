import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { hasAnyRole } from "@/lib/roleUtils";
import { prisma } from "@/lib/prisma";
import { getAzuraCastPublicConfig } from "@/lib/azuracast";

export const dynamic = "force-dynamic";

function canManage(roleString) {
  return hasAnyRole(roleString, ["DEVELOPER", "TECHNIC"]);
}

function parseHours(value) {
  const hours = Number(value);
  if (!Number.isFinite(hours)) return 24;
  return Math.min(Math.max(hours, 1), 168);
}

function parseDateParam(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = getAzuraCastPublicConfig();
  if (!config.stationId) {
    return NextResponse.json({
      config,
      snapshots: [],
      error: "AZURACAST_STATION_ID missing",
    });
  }

  const { searchParams } = new URL(req.url);
  const hours = parseHours(searchParams.get("hours"));
  const from = parseDateParam(searchParams.get("from"));
  const to = parseDateParam(searchParams.get("to"));
  const since = from || new Date(Date.now() - hours * 60 * 60 * 1000);
  const until = to || new Date();

  const snapshots = await prisma.azuraCastListenerSnapshot.findMany({
    where: {
      stationId: String(config.stationId),
      createdAt: {
        gte: since,
        lte: until,
      },
    },
    orderBy: { createdAt: "asc" },
    take: 1000,
  });

  return NextResponse.json({
    config,
    hours,
    from: since,
    to: until,
    snapshots: snapshots.map((snapshot) => ({
      id: snapshot.id,
      current: snapshot.current,
      unique: snapshot.unique,
      total: snapshot.total,
      source: snapshot.source,
      createdAt: snapshot.createdAt,
    })),
  });
}
