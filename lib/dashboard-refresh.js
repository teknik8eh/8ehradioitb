const REFRESH_INTERVAL_MS = 60_000;

export function createDashboardRefresh(load, { polling = true } = {}) {
  let lastStartedAt = -Infinity;
  let requested = false;
  let disposed = false;
  let controller;
  let timer;

  function schedule() {
    clearTimeout(timer);
    if (disposed || controller) return;

    if (requested) {
      timer = setTimeout(run, 0);
    } else if (polling && !document.hidden) {
      const wait = Math.max(0, lastStartedAt + REFRESH_INTERVAL_MS - Date.now());
      timer = setTimeout(run, wait);
    }
  }

  async function run() {
    if (disposed || (!requested && (!polling || document.hidden))) return;

    requested = false;
    lastStartedAt = Date.now();
    controller = new AbortController();
    try {
      await load(controller.signal);
    } finally {
      controller = undefined;
      schedule();
    }
  }

  document.addEventListener("visibilitychange", schedule);
  schedule();

  return {
    refresh() {
      requested = true;
      schedule();
    },
    setPollingEnabled(enabled) {
      polling = enabled;
      schedule();
    },
    dispose() {
      disposed = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", schedule);
    },
  };
}
