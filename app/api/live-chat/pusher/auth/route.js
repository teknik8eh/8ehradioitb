// POST /api/live-chat/pusher/auth
// Authenticate Pusher private/presence channel subscription untuk guest.
//
// Presence channel `presence-chat-{roomId}` dipakai untuk counter pendengar.
// Hanya guest dengan session valid yang boleh subscribe presence channel.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { getGuestSessionId } from "@/lib/session";

export async function POST(req) {
  if (!pusherServer) {
    return NextResponse.json(
      { error: "Pusher belum dikonfigurasi." },
      { status: 503 },
    );
  }

  // Pusher client mengirim sebagai form-encoded body: socket_id & channel_name
  const formData = await req.formData().catch(() => null);
  const socketId =
    formData?.get("socket_id") ||
    new URL(req.url).searchParams.get("socket_id");
  const channelName =
    formData?.get("channel_name") ||
    new URL(req.url).searchParams.get("channel_name");

  if (!socketId || !channelName) {
    return NextResponse.json(
      { error: "socket_id dan channel_name wajib diisi." },
      { status: 400 },
    );
  }

  const sessionId = await getGuestSessionId();
  if (!sessionId) {
    return NextResponse.json(
      { error: "Guest session tidak ditemukan." },
      { status: 401 },
    );
  }

  const guest = await prisma.guestSession.findUnique({
    where: { sessionId },
  });
  if (!guest) {
    return NextResponse.json(
      { error: "Guest session tidak valid." },
      { status: 401 },
    );
  }

  // Presence channel: sertakan user info (id + name)
  let authResponse;
  if (channelName.startsWith("presence-")) {
    authResponse = pusherServer.authorizeChannel(socketId, channelName, {
      user_id: guest.sessionId,
      user_info: { name: guest.guestName },
    });
  } else {
    // Private channel fallback
    authResponse = pusherServer.authorizeChannel(socketId, channelName);
  }

  return NextResponse.json(authResponse);
}
