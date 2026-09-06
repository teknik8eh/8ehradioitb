import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { hasAnyRole } from "@/lib/roleUtils";

export const dynamic = "force-dynamic";

function canManage(roleString) {
  return hasAnyRole(roleString, ["MUSIC", "DEVELOPER"]);
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function requireManager() {
  const session = await getServerSession(authOptions);
  if (!session || !canManage(session.user.role)) return null;
  return session;
}

async function getPlaylists() {
  return prisma.nowPlayingPlaylist.findMany({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
    include: {
      items: {
        orderBy: { order: "asc" },
      },
    },
  });
}

async function normalizeItemOrders(playlistId) {
  const items = await prisma.nowPlayingPlaylistItem.findMany({
    where: { playlistId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  await Promise.all(
    items.map((item, index) =>
      prisma.nowPlayingPlaylistItem.update({
        where: { id: item.id },
        data: { order: index + 1 },
      }),
    ),
  );
}

export async function GET() {
  const session = await requireManager();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await getPlaylists());
  } catch (error) {
    console.error("Failed to fetch now playing playlists:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req) {
  const session = await requireManager();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const action = cleanString(body?.action);

    if (action === "create-playlist") {
      const name = cleanString(body?.name);
      if (!name) {
        return NextResponse.json(
          { error: "Playlist name is required" },
          { status: 400 },
        );
      }

      await prisma.nowPlayingPlaylist.create({ data: { name } });
      return NextResponse.json(await getPlaylists());
    }

    if (action === "add-item") {
      const playlistId = cleanString(body?.playlistId);
      const title = cleanString(body?.title);
      const artist = cleanString(body?.artist);
      const coverImage = cleanString(body?.coverImage);

      if (!playlistId || !title || !artist) {
        return NextResponse.json(
          { error: "playlistId, title, and artist are required" },
          { status: 400 },
        );
      }

      const playlist = await prisma.nowPlayingPlaylist.findUnique({
        where: { id: playlistId },
      });
      if (!playlist || !playlist.isActive) {
        return NextResponse.json(
          { error: "Playlist not found" },
          { status: 404 },
        );
      }

      const lastItem = await prisma.nowPlayingPlaylistItem.findFirst({
        where: { playlistId },
        orderBy: { order: "desc" },
      });

      await prisma.nowPlayingPlaylistItem.create({
        data: {
          playlistId,
          title,
          artist,
          coverImage: coverImage || null,
          order: (lastItem?.order || 0) + 1,
        },
      });

      return NextResponse.json(await getPlaylists());
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to create now playing playlist data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req) {
  const session = await requireManager();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const action = cleanString(body?.action);

    if (action === "update-playlist") {
      const playlistId = cleanString(body?.playlistId);
      const name = cleanString(body?.name);

      if (!playlistId || !name) {
        return NextResponse.json(
          { error: "playlistId and name are required" },
          { status: 400 },
        );
      }

      await prisma.nowPlayingPlaylist.update({
        where: { id: playlistId },
        data: { name },
      });

      return NextResponse.json(await getPlaylists());
    }

    if (action === "update-item") {
      const itemId = cleanString(body?.itemId);
      const title = cleanString(body?.title);
      const artist = cleanString(body?.artist);
      const coverImage = cleanString(body?.coverImage);

      if (!itemId || !title || !artist) {
        return NextResponse.json(
          { error: "itemId, title, and artist are required" },
          { status: 400 },
        );
      }

      await prisma.nowPlayingPlaylistItem.update({
        where: { id: itemId },
        data: { title, artist, coverImage: coverImage || null },
      });

      const state = await prisma.nowPlayingState.findUnique({
        where: { key: "main" },
      });
      if (state?.itemId === itemId) {
        await prisma.nowPlayingState.update({
          where: { key: "main" },
          data: { title, artist, coverImage: coverImage || null },
        });
      }

      return NextResponse.json(await getPlaylists());
    }

    if (action === "move-item") {
      const itemId = cleanString(body?.itemId);
      const direction = cleanString(body?.direction);

      if (!itemId || !["up", "down"].includes(direction)) {
        return NextResponse.json(
          { error: "itemId and direction are required" },
          { status: 400 },
        );
      }

      const item = await prisma.nowPlayingPlaylistItem.findUnique({
        where: { id: itemId },
      });
      if (!item) {
        return NextResponse.json(
          { error: "Playlist item not found" },
          { status: 404 },
        );
      }

      const swapItem = await prisma.nowPlayingPlaylistItem.findFirst({
        where: {
          playlistId: item.playlistId,
          order:
            direction === "up"
              ? { lt: item.order }
              : { gt: item.order },
        },
        orderBy: { order: direction === "up" ? "desc" : "asc" },
      });

      if (swapItem) {
        await Promise.all([
          prisma.nowPlayingPlaylistItem.update({
            where: { id: item.id },
            data: { order: swapItem.order },
          }),
          prisma.nowPlayingPlaylistItem.update({
            where: { id: swapItem.id },
            data: { order: item.order },
          }),
        ]);
      }

      return NextResponse.json(await getPlaylists());
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update now playing playlist data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req) {
  const session = await requireManager();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const playlistId = cleanString(body?.playlistId);
    const itemId = cleanString(body?.itemId);

    if (itemId) {
      const item = await prisma.nowPlayingPlaylistItem.delete({
        where: { id: itemId },
      });
      await normalizeItemOrders(item.playlistId);

      const state = await prisma.nowPlayingState.findUnique({
        where: { key: "main" },
      });
      if (state?.itemId === itemId) {
        await prisma.nowPlayingState.update({
          where: { key: "main" },
          data: {
            playlistId: null,
            itemId: null,
            title: null,
            artist: null,
            coverImage: null,
            isActive: false,
            startedAt: null,
          },
        });
      }

      return NextResponse.json(await getPlaylists());
    }

    if (playlistId) {
      await prisma.nowPlayingPlaylist.update({
        where: { id: playlistId },
        data: { isActive: false },
      });

      const state = await prisma.nowPlayingState.findUnique({
        where: { key: "main" },
      });
      if (state?.playlistId === playlistId) {
        await prisma.nowPlayingState.update({
          where: { key: "main" },
          data: {
            playlistId: null,
            itemId: null,
            title: null,
            artist: null,
            coverImage: null,
            isActive: false,
            startedAt: null,
          },
        });
      }

      return NextResponse.json(await getPlaylists());
    }

    return NextResponse.json(
      { error: "playlistId or itemId is required" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Failed to delete now playing playlist data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
