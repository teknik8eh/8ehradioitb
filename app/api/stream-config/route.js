import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { hasAnyRole } from "@/lib/roleUtils";
import { getActiveRoomOrNull, getOrSyncActiveRoom } from "@/lib/live-chat/room";
import { broadcastLiveStatus } from "@/lib/live-chat/pusher";

function isAdmin(roleString) {
  return hasAnyRole(roleString, ["DEVELOPER", "TECHNIC"]);
}

const DEFAULT_STREAM_URL =
  "http://stream.8ehradioitb.com/listen/8eh_radio_itb/radio.mp3";

function normalizeConfig(config) {
  if (!config) {
    return {
      baseUrls: [DEFAULT_STREAM_URL],
      defaultUrl: DEFAULT_STREAM_URL,
      fallbackUrl: DEFAULT_STREAM_URL,
      onAir: true,
      liveChatEnabled: true,
      songRequestEnabled: true,
    };
  }

  const baseUrls = Array.isArray(config.baseUrls) ? config.baseUrls : [];
  const defaultUrl = config.defaultUrl || baseUrls[0] || DEFAULT_STREAM_URL;
  const fallbackUrl = config.fallbackUrl || defaultUrl || DEFAULT_STREAM_URL;

  return {
    ...config,
    baseUrls: baseUrls.length > 0 ? baseUrls : [defaultUrl],
    defaultUrl,
    fallbackUrl,
    onAir: typeof config.onAir === "boolean" ? config.onAir : true,
    liveChatEnabled: config.liveChatEnabled !== false,
    songRequestEnabled: config.songRequestEnabled !== false,
  };
}

function buildConfigData(body, currentConfig) {
  const current = normalizeConfig(currentConfig);
  const baseUrls = Array.isArray(body.baseUrls) && body.baseUrls.length > 0
    ? body.baseUrls
    : current.baseUrls;
  const defaultUrl = body.defaultUrl || current.defaultUrl || baseUrls[0];
  const fallbackUrl = body.fallbackUrl || current.fallbackUrl || defaultUrl;

  return {
    baseUrls,
    defaultUrl,
    fallbackUrl,
    onAir: typeof body.onAir === "boolean" ? body.onAir : current.onAir,
    liveChatEnabled:
      typeof body.liveChatEnabled === "boolean"
        ? body.liveChatEnabled
        : current.liveChatEnabled,
    songRequestEnabled:
      typeof body.songRequestEnabled === "boolean"
        ? body.songRequestEnabled
        : current.songRequestEnabled,
  };
}

export async function GET() {
  const config = await prisma.streamConfig.findFirst();
  const activeRoom = await getActiveRoomOrNull();

  return NextResponse.json({
    ...normalizeConfig(config),
    roomId: activeRoom?.id ?? null,
    broadcastId: activeRoom?.broadcastId ?? null,
    broadcastStartedAt: activeRoom?.createdAt?.toISOString() ?? null,
  });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const currentConfig = await prisma.streamConfig.findFirst();
  const previousConfig = normalizeConfig(currentConfig);
  const data = buildConfigData(body, currentConfig);

  const config = currentConfig
    ? await prisma.streamConfig.update({
        where: { id: currentConfig.id },
        data,
      })
    : await prisma.streamConfig.create({ data });

  const room = await getOrSyncActiveRoom();
  const normalized = normalizeConfig(config);

  if (
    previousConfig.onAir !== normalized.onAir ||
    previousConfig.liveChatEnabled !== normalized.liveChatEnabled ||
    previousConfig.songRequestEnabled !== normalized.songRequestEnabled
  ) {
    await broadcastLiveStatus({
      isLive: normalized.onAir,
      roomId: room?.id ?? null,
      liveChatEnabled: normalized.liveChatEnabled,
      songRequestEnabled: normalized.songRequestEnabled,
    });
  }

  return NextResponse.json({
    ...normalized,
    roomId: room?.id ?? null,
    broadcastId: room?.broadcastId ?? null,
    broadcastStartedAt: room?.createdAt?.toISOString() ?? null,
  });
}
