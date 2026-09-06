import Pusher from "pusher";
import type {
  NewMessageEvent,
  MessageDeletedEvent,
  GuestMutedEvent,
  RoomStatusEvent,
  LiveStatusEvent,
} from "@/lib/live-chat/chat";

/**
 * Server-side Pusher client. Hanya dipanggil dari route handler (server),
 * tidak pernah di-import ke client component (secret tidak boleh bocor ke browser).
 *
 * Channel naming convention: `chat-room-{roomId}`
 * Event naming convention: lihat tiap fungsi di bawah.
 *
 * Untuk subscribe di client (Next.js client component), pakai pusher-js:
 *   const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER });
 *   const channel = pusher.subscribe(`chat-room-${roomId}`);
 *   channel.bind("new-message", (data) => { ... });
 */
function getPusherConfig() {
  const appId = process.env.PUSHER_APP_ID?.trim();
  const key = process.env.PUSHER_KEY?.trim();
  const secret = process.env.PUSHER_SECRET?.trim();
  const cluster = process.env.PUSHER_CLUSTER?.trim();

  if (!appId || !key || !secret || !cluster) return null;

  return { appId, key, secret, cluster };
}

export const pusherServer = (() => {
  const config = getPusherConfig();
  if (!config) return null;

  return new Pusher({
    ...config,
    useTLS: true,
  });
})();

export function chatRoomChannel(roomId: string): string {
  return `chat-room-${roomId}`;
}

async function trigger(channel: string, event: string, payload: unknown) {
  if (!pusherServer) return;

  try {
    await pusherServer.trigger(channel, event, payload);
  } catch (err) {
    console.error(`[live-chat pusher] ${event} failed:`, err);
  }
}

export async function broadcastNewMessage(roomId: string, payload: NewMessageEvent) {
  await trigger(chatRoomChannel(roomId), "new-message", payload);
}

export async function broadcastMessageDeleted(roomId: string, payload: MessageDeletedEvent) {
  await trigger(chatRoomChannel(roomId), "message-deleted", payload);
}

export async function broadcastGuestMuted(roomId: string, payload: GuestMutedEvent) {
  await trigger(chatRoomChannel(roomId), "guest-muted", payload);
}

export async function broadcastRoomStatus(roomId: string, payload: RoomStatusEvent) {
  await trigger(chatRoomChannel(roomId), "room-status", payload);
}

/**
 * Channel global untuk status siaran — dipakai client yang belum tahu roomId
 * (misal lagi di halaman tunggu sebelum siaran mulai).
 *
 * Client subscribe:
 *   const channel = pusher.subscribe("live-status");
 *   channel.bind("live-started", ({ roomId }) => { ... }); // siaran mulai
 *   channel.bind("live-ended",   ({ roomId }) => { ... }); // siaran selesai
 *
 * Dipanggil dari: POST /api/stream-config (lihat instruksi di STREAM_CONFIG_PATCH.md)
 */
export const LIVE_STATUS_CHANNEL = "live-status";

export async function broadcastLiveStatus(payload: LiveStatusEvent) {
  await trigger(LIVE_STATUS_CHANNEL, payload.isLive ? "live-started" : "live-ended", payload);
}
