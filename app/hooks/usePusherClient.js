// app/hooks/usePusherClient.js
// Singleton Pusher client (client-side) untuk Live Chat.
// Membaca key/cluster dari NEXT_PUBLIC_* env.
import Pusher from "pusher-js";

let client = null;
const channelRefs = new Map();

/**
 * Return Pusher client singleton, atau null bila env belum dikonfigurasi.
 * Presence/private channel akan melewati endpoint auth: /api/live-chat/pusher/auth
 */
export function getPusherClient() {
  if (client) return client;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!key || !cluster) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[usePusherClient] NEXT_PUBLIC_PUSHER_KEY/CLUSTER belum diset. " +
          "Real-time Live Chat akan nonaktif (fitur tetap jalan via polling/fetch).",
      );
    }
    return null;
  }

  client = new Pusher(key, {
    cluster,
    forceTLS: true,
    authEndpoint: "/api/live-chat/pusher/auth",
    // Pusher butuh header untuk FormData auth; default sudah cukup.
  });

  return client;
}

export function subscribePusherChannel(channelName) {
  const pusher = getPusherClient();
  if (!pusher) return null;

  channelRefs.set(channelName, (channelRefs.get(channelName) || 0) + 1);
  return {
    pusher,
    channel: pusher.subscribe(channelName),
  };
}

export function unsubscribePusherChannel(channelName) {
  if (!client) return;

  const nextCount = (channelRefs.get(channelName) || 1) - 1;
  if (nextCount > 0) {
    channelRefs.set(channelName, nextCount);
    return;
  }

  channelRefs.delete(channelName);
  client.unsubscribe(channelName);
}
