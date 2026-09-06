import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { hasAnyRole } from "@/lib/roleUtils";
import { getBroadcastServerState } from "@/lib/broadcastServer";

export const dynamic = "force-dynamic";

function canManage(roleString) {
  return hasAnyRole(roleString, ["DEVELOPER", "TECHNIC"]);
}

function errorResponse(error) {
  return NextResponse.json(
    {
      error: error.message || "Broadcast server request failed",
      code: error.code || "BROADCAST_SERVER_ERROR",
    },
    { status: error.status || 500 },
  );
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await getBroadcastServerState());
  } catch (error) {
    console.error("Failed to fetch broadcast server state:", error);
    return errorResponse(error);
  }
}
