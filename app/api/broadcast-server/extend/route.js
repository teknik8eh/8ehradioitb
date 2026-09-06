import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { hasAnyRole } from "@/lib/roleUtils";
import { extendBroadcastServer } from "@/lib/broadcastServer";

export const dynamic = "force-dynamic";

function canManage(roleString) {
  return hasAnyRole(roleString, ["DEVELOPER", "TECHNIC"]);
}

function errorResponse(error) {
  return NextResponse.json(
    {
      error: error.message || "Failed to extend broadcast server",
      code: error.code || "BROADCAST_SERVER_ERROR",
    },
    { status: error.status || 500 },
  );
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(
      await extendBroadcastServer(session.user.email || session.user.name),
    );
  } catch (error) {
    console.error("Failed to extend broadcast server:", error);
    return errorResponse(error);
  }
}
