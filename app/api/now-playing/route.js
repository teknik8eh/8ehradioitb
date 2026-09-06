import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { hasAnyRole } from "@/lib/roleUtils";
import { publishNowPlaying } from "@/lib/pusher";

export const dynamic = "force-dynamic";

const STATE_KEY = "main";

function canManage(roleString) {
  return hasAnyRole(roleString, ["MUSIC", "DEVELOPER"]);
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function getFallbackPayload() {
  const config = await prisma.playerConfig.findFirst();
  return {
    source: "fallback",
    title: config?.title || "8EH Radio ITB",
    artist: config?.subtitle || "Live Now",
    coverImage: config?.coverImage || "/8eh.png",
    isActive: false,
    playlistId: null,
    itemId: null,
    startedAt: null,
    updatedAt: config?.updatedAt || null,
  };
}

function statePayload(state, coverImage) {
  if (!state?.isActive || !state.title) return null;

  return {
    source: state.source,
    title: state.title,
    artist: state.artist || "",
    coverImage: state.coverImage || coverImage || "/8eh.png",
    isActive: true,
    playlistId: state.playlistId || null,
    itemId: state.itemId || null,
    startedAt: state.startedAt,
    updatedAt: state.updatedAt,
  };
}

async function getCurrentNowPlaying() {
  const [state, fallback] = await Promise.all([
    prisma.nowPlayingState.findUnique({ where: { key: STATE_KEY } }),
    getFallbackPayload(),
  ]);

  return statePayload(state, fallback.coverImage) || fallback;
}

async function requireManager() {
  const session = await getServerSession(authOptions);
  if (!session || !canManage(session.user.role)) return null;
  return session;
}

async function upsertState(data) {
  return prisma.nowPlayingState.upsert({
    where: { key: STATE_KEY },
    update: data,
    create: {
      key: STATE_KEY,
      ...data,
    },
  });
}

async function setItemNowPlaying(itemId, session) {
  const item = await prisma.nowPlayingPlaylistItem.findUnique({
    where: { id: itemId },
    include: { playlist: true },
  });

  if (!item || !item.playlist?.isActive) {
    return { error: "Playlist item not found", status: 404 };
  }

  const state = await upsertState({
    source: "manual-playlist",
    playlistId: item.playlistId,
    itemId: item.id,
    title: item.title,
    artist: item.artist,
    coverImage: item.coverImage || null,
    isActive: true,
    startedAt: new Date(),
    updatedBy: session.user?.email || session.user?.name || null,
  });

  return { payload: state };
}

async function respondAndPublish(payload) {
  await publishNowPlaying(payload).catch((error) => {
    console.error("Failed to publish now playing update:", error);
  });
  return NextResponse.json(payload);
}

export async function GET() {
  try {
    return NextResponse.json(await getCurrentNowPlaying());
  } catch (error) {
    console.error("Failed to fetch now playing:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req) {
  try {
    const session = await requireManager();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const action = cleanString(body?.action);

    if (action === "set-item") {
      const itemId = cleanString(body?.itemId);
      if (!itemId) {
        return NextResponse.json(
          { error: "itemId is required" },
          { status: 400 },
        );
      }

      const result = await setItemNowPlaying(itemId, session);
      if (result.error) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status },
        );
      }

      return respondAndPublish(await getCurrentNowPlaying());
    }

    if (action === "next") {
      const current = await prisma.nowPlayingState.findUnique({
        where: { key: STATE_KEY },
      });

      if (!current?.isActive || !current.playlistId) {
        return NextResponse.json(
          { error: "No active playlist item" },
          { status: 400 },
        );
      }

      const currentItem = current.itemId
        ? await prisma.nowPlayingPlaylistItem.findUnique({
            where: { id: current.itemId },
          })
        : null;

      const nextItem = await prisma.nowPlayingPlaylistItem.findFirst({
        where: {
          playlistId: current.playlistId,
          order: { gt: currentItem?.order ?? -1 },
        },
        orderBy: { order: "asc" },
      });

      if (!nextItem) {
        return NextResponse.json(
          { error: "No next playlist item available" },
          { status: 404 },
        );
      }

      const result = await setItemNowPlaying(nextItem.id, session);
      if (result.error) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status },
        );
      }

      return respondAndPublish(await getCurrentNowPlaying());
    }

    if (action === "clear") {
      await upsertState({
        source: "manual-playlist",
        playlistId: null,
        itemId: null,
        title: null,
        artist: null,
        coverImage: null,
        isActive: false,
        startedAt: null,
        updatedBy: session.user?.email || session.user?.name || null,
      });

      return respondAndPublish(await getCurrentNowPlaying());
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update now playing:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
