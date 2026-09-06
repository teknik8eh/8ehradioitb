import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { hasAnyRole } from "@/lib/roleUtils";
import { resolveR2DownloadUrl } from "@/lib/storage/r2";
import { EVENT_ACTIONS, assertEventAction } from "@/lib/events/auth";

function isValidKey(key) {
  return (
    typeof key === "string" &&
    key.trim().length > 0 &&
    key.length <= 1000 &&
    !key.includes("..")
  );
}

async function canAccessFileKey(session, key) {
  if (hasAnyRole(session.user.role, ["DEVELOPER", "DATA"])) {
    return true;
  }

  if (key.startsWith(`kru-profile/${session.user.id}/`)) {
    return true;
  }

  if (key.startsWith("forms/")) {
    const [, eventSlug] = key.split("/");
    if (!eventSlug) return false;

    const event = await prisma.event.findUnique({
      where: { slug: eventSlug },
      select: { id: true },
    });

    if (!event) return false;
    const authResponse = await assertEventAction(
      session.user.id,
      event.id,
      EVENT_ACTIONS.SUBMISSION_READ,
    );
    return !authResponse;
  }

  return false;
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const key = typeof body?.key === "string" ? body.key.trim() : "";
    const fileName =
      typeof body?.fileName === "string" ? body.fileName.trim() : "";

    if (!isValidKey(key)) {
      return NextResponse.json({ error: "invalid_file_key" }, { status: 400 });
    }

    const allowed = await canAccessFileKey(session, key);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const downloadUrl = await resolveR2DownloadUrl(key, {
      forceDownload: true,
      fileName,
    });

    if (!downloadUrl) {
      return NextResponse.json(
        { error: "download_url_unavailable" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      key,
      downloadUrl,
    });
  } catch (error) {
    console.error("Failed to build file download URL:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 },
    );
  }
}
