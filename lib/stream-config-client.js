const REFRESH_INTERVAL = 120_000;

export function watchStreamConfig(revalidate, channel) {
  let lastRequestedAt = -Infinity;
  let pending = false;
  let invalidated = false;
  let timer;
  let disposed = false;

  function scheduleRefresh() {
    clearTimeout(timer);
    if (disposed || pending || document.hidden) return;

    const wait = lastRequestedAt + REFRESH_INTERVAL - Date.now();
    if (!invalidated && wait > 0) {
      timer = setTimeout(scheduleRefresh, wait);
      return;
    }

    invalidated = false;
    pending = true;
    lastRequestedAt = Date.now();
    void revalidate().then(finishRefresh, finishRefresh);
  }

  function finishRefresh() {
    pending = false;
    scheduleRefresh();
  }

  function invalidate() {
    invalidated = true;
    scheduleRefresh();
  }

  channel?.bind("live-started", invalidate);
  channel?.bind("live-ended", invalidate);
  document.addEventListener("visibilitychange", scheduleRefresh);
  window.addEventListener("online", invalidate);
  scheduleRefresh();

  return () => {
    disposed = true;
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", scheduleRefresh);
    window.removeEventListener("online", invalidate);
    channel?.unbind("live-started", invalidate);
    channel?.unbind("live-ended", invalidate);
  };
}
