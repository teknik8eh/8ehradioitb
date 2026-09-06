import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { hasAnyRole } from "@/lib/roleUtils";
import { prisma } from "@/lib/prisma";
import {
  getAzuraCastDashboardConfig,
  getAzuraCastDashboardConfigWithStationDetails,
  getAzuraCastListenerStats,
  getAzuraCastStatus,
} from "@/lib/azuracast";

export const dynamic = "force-dynamic";

function canManage(roleString) {
  return hasAnyRole(roleString, ["DEVELOPER", "TECHNIC"]);
}

function errorResponse(error) {
  return NextResponse.json(
    {
      error: error.message || "Stream service request failed",
      code: error.code || "AZURACAST_ERROR",
      config: getAzuraCastDashboardConfig(),
      payload: error.payload || null,
    },
    { status: error.status || 500 },
  );
}

async function getBroadcastServerGate() {
  const state = await prisma.broadcastServerState.findUnique({
    where: { key: "main" },
    select: {
      status: true,
      phase: true,
      activeServerIp: true,
      lastError: true,
      updatedAt: true,
    },
  });

  return {
    isRunning: state?.status === "running",
    status: state?.status || "idle",
    phase: state?.phase || "idle",
    activeServerIp: state?.activeServerIp || null,
    lastError: state?.lastError || null,
    updatedAt: state?.updatedAt?.toISOString?.() || null,
  };
}

async function recordListenerSnapshot(config, listeners) {
  const hasStats = ["current", "unique", "total"].some(
    (key) => typeof listeners?.[key] === "number",
  );
  if (!config?.stationId || !hasStats) return;

  try {
    await prisma.azuraCastListenerSnapshot.create({
      data: {
        stationId: String(config.stationId),
        current:
          typeof listeners.current === "number" ? listeners.current : null,
        unique: typeof listeners.unique === "number" ? listeners.unique : null,
        total: typeof listeners.total === "number" ? listeners.total : null,
        source: listeners.source || null,
      },
    });
  } catch (error) {
    console.warn("Failed to record stream listener snapshot:", error);
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const broadcastServer = await getBroadcastServerGate();
    if (!broadcastServer.isRunning) {
      return NextResponse.json({
        config: getAzuraCastDashboardConfig(),
        broadcastServer,
        status: {
          stationId: null,
          services: { frontend: "unavailable" },
          raw: null,
          checkedAt: new Date().toISOString(),
        },
        listeners: {
          current: null,
          unique: null,
          total: null,
          checkedAt: new Date().toISOString(),
          source: "broadcast_server_offline",
          error: "Broadcast Control is not running.",
        },
        locked: true,
        lockReason: "Broadcast Control is not running.",
      });
    }

    const [status, config, listeners] = await Promise.all([
      getAzuraCastStatus(),
      getAzuraCastDashboardConfigWithStationDetails(),
      getAzuraCastListenerStats(),
    ]);

    await recordListenerSnapshot(config, listeners);

    return NextResponse.json({
      config,
      status,
      listeners,
      broadcastServer,
    });
  } catch (error) {
    console.error("Failed to fetch stream status:", error);
    return errorResponse(error);
  }
}
