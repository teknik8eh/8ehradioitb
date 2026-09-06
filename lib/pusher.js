import Pusher from "pusher";

const globalForPusher = global;

function getPusherConfig() {
  const appId = process.env.PUSHER_APP_ID?.trim();
  const key = process.env.PUSHER_KEY?.trim();
  const secret = process.env.PUSHER_SECRET?.trim();
  const cluster = process.env.PUSHER_CLUSTER?.trim();

  if (!appId || !key || !secret || !cluster) return null;

  return { appId, key, secret, cluster };
}

function createPusherServer() {
  const config = getPusherConfig();
  if (!config) return null;

  return new Pusher({
    ...config,
    useTLS: true,
  });
}

export const pusherServer =
  globalForPusher.__pusherServer ?? createPusherServer();

if (process.env.NODE_ENV !== "production") {
  globalForPusher.__pusherServer = pusherServer;
}

export const CHAT_CHANNEL_PREFIX = "chat-";
export const BROADCAST_CHANNEL_PREFIX = "broadcast-";

export function chatChannelName(roomId) {
  return `${CHAT_CHANNEL_PREFIX}${roomId}`;
}

export function broadcastChannelName(broadcastId) {
  return `${BROADCAST_CHANNEL_PREFIX}${broadcastId}`;
}

export function isPusherConfigured() {
  return pusherServer !== null;
}

async function triggerBatch(channel, events, label) {
  if (!pusherServer) return;

  const payload = Array.isArray(events)
    ? events.map((event) => ({ channel, ...event }))
    : [{ channel, ...events }];

  try {
    await pusherServer.triggerBatch(payload);
  } catch (err) {
    console.error(`[pusher] ${label} failed:`, err?.message || err);
  }
}

export async function triggerChatEvent(roomId, events) {
  await triggerBatch(chatChannelName(roomId), events, "triggerChatEvent");
}

export async function triggerSongRequestEvent(broadcastId, events) {
  await triggerBatch(
    broadcastChannelName(broadcastId),
    events,
    "triggerSongRequestEvent",
  );
}

export async function publishNowPlaying(payload) {
  if (!pusherServer) return;
  await pusherServer.trigger("now-playing", "updated", payload);
}
