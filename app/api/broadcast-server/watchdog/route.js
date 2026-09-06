import { NextResponse } from "next/server";
import { runBroadcastServerWatchdog } from "@/lib/broadcastServer";

export const dynamic = "force-dynamic";

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getBearerToken(req) {
  const header = cleanString(req.headers.get("authorization"));
  if (!header.toLowerCase().startsWith("bearer ")) return "";
  return header.slice(7).trim();
}

function isAuthorized(req) {
  const expected = cleanString(process.env.BROADCAST_SERVER_WATCHDOG_SECRET);
  if (!expected) {
    const error = new Error("BROADCAST_SERVER_WATCHDOG_SECRET is not configured");
    error.status = 500;
    throw error;
  }

  const url = new URL(req.url);
  const provided =
    cleanString(url.searchParams.get("secret")) || getBearerToken(req);

  return provided && provided === expected;
}

function errorResponse(error) {
  return NextResponse.json(
    {
      ok: false,
      error: error.message || "Broadcast server watchdog failed",
    },
    { status: error.status || 500 },
  );
}

export async function GET(req) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    return NextResponse.json(await runBroadcastServerWatchdog());
  } catch (error) {
    console.error("Broadcast server watchdog failed:", error);
    return errorResponse(error);
  }
}

export async function POST(req) {
  return GET(req);
}
