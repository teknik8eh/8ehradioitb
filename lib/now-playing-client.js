const CONNECTED_INTERVAL = 5 * 60_000;
const FALLBACK_INTERVAL = 60_000;
const STUDIO_EXPIRY = 3 * 60_000;

async function fetchMetadata(url, signal) {
  const response = await fetch(url, { cache: "no-store", signal });
  if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
    throw new Error("Failed to fetch now playing");
  }
  return response.json();
}

function getStudioExpiry(snapshot) {
  if (
    snapshot?.isActive &&
    (snapshot.source === "studio-agent" || snapshot.source === "studio-program")
  ) {
    return Date.parse(snapshot.updatedAt) + STUDIO_EXPIRY + 1_000;
  }
  return undefined;
}

export function watchNowPlaying(subscription, onUpdate) {
  const channel = subscription?.channel;
  const connection = subscription?.pusher.connection;
  let subscribed = Boolean(channel?.subscribed);
  let hasSubscribed = subscribed;
  let refreshRequested = true;
  let disposed = false;
  let lastCheckedAt = -Infinity;
  let failed = false;
  let revision = 0;
  let snapshot;
  let controller;
  let timer;

  function schedule() {
    clearTimeout(timer);
    if (disposed || controller || document.hidden) return;

    const expiresAt = getStudioExpiry(snapshot);
    const interval = subscribed && !failed ? CONNECTED_INTERVAL : FALLBACK_INTERVAL;
    let dueAt = lastCheckedAt + interval;
    if (!failed && expiresAt) {
      // Avoid immediate rechecks if a response arrives at the expiry boundary.
      dueAt = Math.min(dueAt, Math.max(expiresAt, lastCheckedAt + 15_000));
    }

    const wait = dueAt - Date.now();
    if (refreshRequested || wait <= 0) void refresh();
    else timer = setTimeout(schedule, wait);
  }

  async function refresh() {
    refreshRequested = false;
    lastCheckedAt = Date.now();
    const requestedRevision = revision;
    const request = new AbortController();
    controller = request;
    const { signal } = request;
    const timeout = setTimeout(() => request.abort(), 10_000);
    let usedFallback = false;

    try {
      const data = await fetchMetadata("/api/now-playing", signal).catch((error) => {
        if (signal.aborted || snapshot) throw error;
        usedFallback = true;
        return fetchMetadata("/api/player-config", signal);
      });
      if (!disposed && requestedRevision === revision && data) {
        snapshot = data;
        failed = usedFallback;
        onUpdate(data);
      }
    } catch {
      if (requestedRevision === revision) failed = true;
    } finally {
      clearTimeout(timeout);
      controller = undefined;
      schedule();
    }
  }

  function handleUpdate(data) {
    revision += 1;
    snapshot = data;
    failed = false;
    lastCheckedAt = Date.now();
    onUpdate(data);
    schedule();
  }

  function handleSubscribed() {
    if (subscribed) return;
    if (hasSubscribed || Date.now() - lastCheckedAt > 5_000) {
      refreshRequested = true;
    }
    subscribed = true;
    hasSubscribed = true;
    schedule();
  }

  function handleUnsubscribed() {
    subscribed = false;
    schedule();
  }

  function handleConnectionChange({ current }) {
    if (current !== "connected") handleUnsubscribed();
  }

  channel?.bind("updated", handleUpdate);
  channel?.bind("pusher:subscription_succeeded", handleSubscribed);
  channel?.bind("pusher:subscription_error", handleUnsubscribed);
  connection?.bind("state_change", handleConnectionChange);
  document.addEventListener("visibilitychange", schedule);
  schedule();

  return () => {
    disposed = true;
    clearTimeout(timer);
    controller?.abort();
    document.removeEventListener("visibilitychange", schedule);
    channel?.unbind("updated", handleUpdate);
    channel?.unbind("pusher:subscription_succeeded", handleSubscribed);
    channel?.unbind("pusher:subscription_error", handleUnsubscribed);
    connection?.unbind("state_change", handleConnectionChange);
  };
}
