import { prisma } from "@/lib/prisma";
import {
  createServerFromSnapshot,
  createSnapshot,
  deleteImage,
  deleteServer,
  getBroadcastServerPublicConfig,
  getImage,
  getSeedSnapshotId,
  getServer,
  isTransientBroadcastStatus,
} from "@/lib/hetzner";

const STATE_KEY = "main";
const HEALTH_TIMEOUT_MS = 6000;
const DEFAULT_MAX_RUNTIME_MINUTES = 240;
const DEFAULT_MIN_RUNTIME_MINUTES = 0;

function cleanEnv(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBaseUrl(value) {
  const cleaned = cleanEnv(value).replace(/\/+$/, "");
  if (!cleaned) return "";
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  return `http://${cleaned}`;
}

function parsePositiveNumber(value, fallback) {
  const number = Number(cleanEnv(value));
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function getMaxRuntimeMinutes() {
  return parsePositiveNumber(
    process.env.BROADCAST_SERVER_MAX_RUNTIME_MINUTES,
    DEFAULT_MAX_RUNTIME_MINUTES,
  );
}

function getWarnAfterMinutes() {
  const maxRuntimeMinutes = getMaxRuntimeMinutes();
  return Math.min(
    parsePositiveNumber(
      process.env.BROADCAST_SERVER_WARN_AFTER_MINUTES,
      Math.max(1, maxRuntimeMinutes - 60),
    ),
    maxRuntimeMinutes,
  );
}

function getExtendMinutes() {
  return parsePositiveNumber(process.env.BROADCAST_SERVER_EXTEND_MINUTES, 60);
}

function getMinRuntimeMinutes() {
  return parsePositiveNumber(
    process.env.BROADCAST_SERVER_MIN_RUNTIME_MINUTES,
    DEFAULT_MIN_RUNTIME_MINUTES,
  );
}

function createError(message, status = 500, code = "BROADCAST_SERVER_ERROR") {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function serializeState(state) {
  return {
    ...state,
    id: state.id,
    createdAt: state.createdAt?.toISOString?.() || state.createdAt,
    updatedAt: state.updatedAt?.toISOString?.() || state.updatedAt,
    startedAt: state.startedAt?.toISOString?.() || state.startedAt,
    endedAt: state.endedAt?.toISOString?.() || state.endedAt,
    autoEndAt: state.autoEndAt?.toISOString?.() || state.autoEndAt,
    autoEndStartedAt:
      state.autoEndStartedAt?.toISOString?.() || state.autoEndStartedAt,
    lastWatchdogAt:
      state.lastWatchdogAt?.toISOString?.() || state.lastWatchdogAt,
    sourcePasswordRotatedAt:
      state.sourcePasswordRotatedAt?.toISOString?.() ||
      state.sourcePasswordRotatedAt,
  };
}

async function ensureState() {
  const existing = await prisma.broadcastServerState.findUnique({
    where: { key: STATE_KEY },
  });
  if (existing) return existing;

  return prisma.broadcastServerState.create({
    data: {
      key: STATE_KEY,
      latestSnapshotId: getSeedSnapshotId() || null,
    },
  });
}

async function updateState(data) {
  return prisma.broadcastServerState.update({
    where: { key: STATE_KEY },
    data,
  });
}

function getBroadcastServerResponseConfig() {
  return {
    ...getBroadcastServerPublicConfig(),
    maxRuntimeMinutes: getMaxRuntimeMinutes(),
    warnAfterMinutes: getWarnAfterMinutes(),
    extendMinutes: getExtendMinutes(),
    minRuntimeMinutes: getMinRuntimeMinutes(),
    watchdogConfigured: Boolean(cleanEnv(process.env.BROADCAST_SERVER_WATCHDOG_SECRET)),
  };
}

function getRuntimeMinutes(state) {
  if (!state.startedAt) return 0;
  return Math.floor(
    (Date.now() - new Date(state.startedAt).getTime()) / 1000 / 60,
  );
}

function getAutoEndDate(state, maxRuntimeMinutes = getMaxRuntimeMinutes()) {
  if (state.autoEndAt) return new Date(state.autoEndAt);
  if (!state.startedAt) return null;
  return new Date(
    new Date(state.startedAt).getTime() + maxRuntimeMinutes * 60 * 1000,
  );
}

function getMinutesUntilDate(value) {
  if (!value) return null;
  const minutes = Math.ceil((value.getTime() - Date.now()) / 1000 / 60);
  return Number.isFinite(minutes) ? minutes : null;
}

function ensureMinimumRuntime(state) {
  const minRuntimeMinutes = getMinRuntimeMinutes();
  if (!minRuntimeMinutes) return;

  const runtimeMinutes = getRuntimeMinutes(state);
  if (runtimeMinutes >= minRuntimeMinutes) return;

  throw createError(
    `Broadcast server must run at least ${minRuntimeMinutes} minutes before it can be ended. Current runtime: ${runtimeMinutes} minutes.`,
    409,
    "BROADCAST_SERVER_MIN_RUNTIME",
  );
}

function isSnapshotReady(image) {
  return ["available", "created"].includes(String(image?.status || ""));
}

async function requestAzuraCastHealth(url, apiKey) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!res.ok) {
      return {
        ok: false,
        message: `Stream health returned ${res.status}`,
      };
    }

    const data = await res.json();
    const frontend = data?.frontendRunning ?? data?.frontend_running;

    return {
      ok: frontend === undefined ? true : Boolean(frontend),
      message:
        frontend === false
          ? "Stream service is not running yet"
          : "Stream service is reachable",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error.name === "AbortError"
          ? "Stream health timed out"
          : error.message || "Stream health failed",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function checkAzuraCastHealth(activeServerIp) {
  const baseUrl = normalizeBaseUrl(process.env.AZURACAST_BASE_URL);
  const stationId = cleanEnv(process.env.AZURACAST_STATION_ID);
  const apiKey = cleanEnv(process.env.AZURACAST_API_KEY);

  if (!baseUrl || !stationId || !apiKey) {
    return {
      ok: false,
      message: "Stream health env is missing",
    };
  }

  const base = new URL(baseUrl);
  const path = `/api/station/${stationId}/status`;
  const publicUrl = `${baseUrl}${path}`;
  const directUrl = activeServerIp ? `${base.protocol}//${activeServerIp}${path}` : "";

  const publicResult = await requestAzuraCastHealth(publicUrl, apiKey);
  if (publicResult.ok) {
    return {
      ok: true,
      message: "Stream public URL is reachable",
    };
  }

  const directResult = directUrl
    ? await requestAzuraCastHealth(directUrl, apiKey)
    : null;
  const directMessage = directResult
    ? `${directUrl}: ${directResult.message}`
    : "Direct server IP check skipped because active IP is not known";

  return {
    ok: false,
    message: [
      `${publicUrl}: ${publicResult.message}`,
      directMessage,
    ].join("; "),
  };
}

async function failState(message) {
  return updateState({
    status: "failed",
    lastError: message,
  });
}

async function advanceCreating(state) {
  if (!state.activeServerId) return state;

  let server;
  try {
    server = await getServer(state.activeServerId);
  } catch (error) {
    if (error.status === 404) {
      const createdRecently =
        state.startedAt &&
        Date.now() - new Date(state.startedAt).getTime() < 5 * 60 * 1000;

      if (createdRecently) {
        return updateState({
          phase: "provider:waiting-for-server",
          lastError: "Cloud server is not visible yet; waiting.",
        });
      }

      return updateState({
        status: "idle",
        phase: "idle",
        activeServerId: null,
        activeServerIp: null,
        serverName: null,
        lastError: "Active server was deleted outside the dashboard.",
      });
    }
    throw error;
  }
  const activeServerIp = server.publicIp || state.activeServerIp;

  if (server.status !== "running") {
    return updateState({
      phase: `provider:${server.status}`,
      activeServerIp,
      lastError: null,
    });
  }

  return updateState({
    status: "booting",
    phase: "health-check",
    activeServerIp,
    lastError: null,
  });
}

async function advanceBooting() {
  const state = await ensureState();
  if (state.activeServerId) {
    try {
      await getServer(state.activeServerId);
    } catch (error) {
      if (error.status === 404) {
        const createdRecently =
          state.startedAt &&
          Date.now() - new Date(state.startedAt).getTime() < 5 * 60 * 1000;

        if (createdRecently) {
          return updateState({
            phase: "provider:waiting-for-server",
            lastError: "Cloud server is not visible yet; waiting.",
          });
        }

        return updateState({
          status: "idle",
          phase: "idle",
          activeServerId: null,
          activeServerIp: null,
          serverName: null,
          lastError: "Active server was deleted outside the dashboard.",
        });
      }
      throw error;
    }
  }

  const health = await checkAzuraCastHealth(state.activeServerIp);
  if (!health.ok) {
    return updateState({
      phase: "health-check",
      lastError: health.message,
    });
  }

  return updateState({
    status: "running",
    phase: "ready",
    lastError: null,
  });
}

async function advanceSnapshotting(state) {
  if (!state.pendingSnapshotId) {
    return failState("Snapshot was requested but no snapshot ID was returned.");
  }

  const image = await getImage(state.pendingSnapshotId);
  if (!isSnapshotReady(image)) {
    return updateState({
      phase: `snapshot:${image.status || "pending"}`,
      lastError: null,
    });
  }

  const previousSnapshotId = state.latestSnapshotId || null;
  return updateState({
    status: "deleting",
    phase: "delete-previous-snapshot",
    latestSnapshotId: state.pendingSnapshotId,
    previousSnapshotId,
    pendingSnapshotId: null,
    lastError: null,
  });
}

async function advanceDeleting(state) {
  if (state.previousSnapshotId) {
    try {
      await deleteImage(state.previousSnapshotId);
    } catch (error) {
      if (error.status !== 404) {
        return failState(
          `Failed to delete previous snapshot: ${error.message}`,
        );
      }
    }
  }

  if (state.activeServerId) {
    try {
      await deleteServer(state.activeServerId);
    } catch (error) {
      if (error.status !== 404) {
        return failState(`Failed to delete active server: ${error.message}`);
      }
    }
  }

  return updateState({
    status: "idle",
    phase: "idle",
    previousSnapshotId: null,
    activeServerId: null,
    activeServerIp: null,
    serverName: null,
    endedAt: new Date(),
    lastAction: "end",
    lastError: null,
  });
}

async function reconcileRunningState(state) {
  if (!state.activeServerId) return state;

  try {
    const server = await getServer(state.activeServerId);
    const activeServerIp = server.publicIp || state.activeServerIp;
    if (activeServerIp !== state.activeServerIp) {
      return updateState({ activeServerIp });
    }
    return state;
  } catch (error) {
    if (error.status === 404) {
      return updateState({
        status: "idle",
        phase: "idle",
        activeServerId: null,
        activeServerIp: null,
        serverName: null,
        pendingSnapshotId: null,
        lastError: "Active server was deleted outside the dashboard.",
      });
    }
    return updateState({
      lastError: `Failed to verify active server: ${error.message}`,
    });
  }
}

export async function advanceBroadcastServerState() {
  const state = await ensureState();
  if (state.status === "running") return reconcileRunningState(state);
  if (!isTransientBroadcastStatus(state.status)) return state;

  try {
    if (state.status === "creating") return advanceCreating(state);
    if (state.status === "booting") return advanceBooting(state);
    if (state.status === "snapshotting") return advanceSnapshotting(state);
    if (state.status === "deleting") return advanceDeleting(state);
    return state;
  } catch (error) {
    return failState(error.message || "Broadcast server lifecycle failed");
  }
}

export async function getBroadcastServerState({ advance = true } = {}) {
  const state = advance ? await advanceBroadcastServerState() : await ensureState();
    return {
      config: getBroadcastServerResponseConfig(),
      state: serializeState(state),
    };
  }

export async function startBroadcastServer(userEmail) {
  let state = await ensureState();
  if (isTransientBroadcastStatus(state.status) || state.status === "running") {
    throw createError("Broadcast server is already active", 409);
  }

  const snapshotId = state.latestSnapshotId || getSeedSnapshotId();
  if (!snapshotId) {
    throw createError("No snapshot ID configured", 500, "SNAPSHOT_MISSING");
  }

  const server = await createServerFromSnapshot(snapshotId);
  state = await updateState({
    status: "creating",
    phase: "provider:create-server",
    activeServerId: server.serverId,
    activeServerIp: server.publicIp,
    serverName: server.serverName,
    latestSnapshotId: snapshotId,
    lastAction: "start",
    lastError: null,
      startedBy: userEmail || null,
      startedAt: new Date(),
      endedAt: null,
      autoEndAt: new Date(Date.now() + getMaxRuntimeMinutes() * 60 * 1000),
      autoEndStartedAt: null,
      lastWatchdogAction: null,
      sourcePasswordRotatedAt: null,
    });
  
    return {
      config: getBroadcastServerResponseConfig(),
      state: serializeState(state),
    };
  }

export async function endBroadcastServer(userEmail, options = {}) {
  let state = await ensureState();
  if (state.status !== "running" || !state.activeServerId) {
    throw createError("No running broadcast server to end", 409);
  }

  if (!options.bypassMinRuntime) {
    ensureMinimumRuntime(state);
  }

  const snapshot = await createSnapshot(state.activeServerId);
  if (!snapshot.snapshotId) {
    throw createError("Server provider did not return a snapshot ID", 502);
  }

  state = await updateState({
    status: "snapshotting",
    phase: "snapshot:requested",
    pendingSnapshotId: snapshot.snapshotId,
      lastAction: "end",
      lastError: null,
      endedBy: userEmail || null,
      autoEndAt: null,
      autoEndStartedAt: options.autoEnd ? new Date() : state.autoEndStartedAt,
    });
  
    return {
      config: getBroadcastServerResponseConfig(),
      state: serializeState(state),
    };
  }

export async function retryBroadcastServer() {
  const state = await ensureState();
  if (state.status !== "failed") {
    throw createError("Broadcast server is not in a failed state", 409);
  }

  if (state.pendingSnapshotId) {
    await updateState({ status: "snapshotting", lastError: null });
  } else if (state.activeServerId && state.lastAction === "start") {
    await updateState({ status: "creating", lastError: null });
  } else if (state.activeServerId && state.lastAction === "end") {
    await updateState({ status: "deleting", lastError: null });
  } else {
    await updateState({ status: "idle", phase: "idle", lastError: null });
  }

  return getBroadcastServerState();
}

export async function extendBroadcastServer(userEmail) {
  const state = await ensureState();
  if (state.status !== "running" || !state.activeServerId) {
    throw createError("No running broadcast server to extend", 409);
  }

  const extendMinutes = getExtendMinutes();
  const currentAutoEndAt = state.autoEndAt ? new Date(state.autoEndAt) : null;
  const baseTime =
    currentAutoEndAt && currentAutoEndAt > new Date()
      ? currentAutoEndAt.getTime()
      : Date.now();
  const nextAutoEndAt = new Date(baseTime + extendMinutes * 60 * 1000);

  const updated = await updateState({
    autoEndAt: nextAutoEndAt,
    lastAction: "extend",
    lastError: null,
    endedBy: userEmail || null,
    autoEndStartedAt: null,
  });

  return {
    config: getBroadcastServerResponseConfig(),
    state: serializeState(updated),
  };
}

export async function runBroadcastServerWatchdog() {
  const maxRuntimeMinutes = getMaxRuntimeMinutes();
  const checkedAt = new Date();
  const statusBefore = (await ensureState()).status;
  let state = await advanceBroadcastServerState();
  const actions = ["advance"];
  let didStartAutoEnd = false;

  let autoEndAt = getAutoEndDate(state, maxRuntimeMinutes);
  let isAutoEndDue =
    state.status === "running" && autoEndAt && Date.now() >= autoEndAt.getTime();

  if (isAutoEndDue) {
    await endBroadcastServer("watchdog", {
      bypassMinRuntime: true,
      autoEnd: true,
    });
    actions.push("auto-end-started");
    didStartAutoEnd = true;
    state = await advanceBroadcastServerState();
  }

  for (let step = 0; step < 2 && isTransientBroadcastStatus(state.status); step += 1) {
    const previousStatus = state.status;
    const previousPhase = state.phase;
    const nextState = await advanceBroadcastServerState();
    state = nextState;
    actions.push("advance-transition");
    if (state.status === previousStatus && state.phase === previousPhase) break;
  }

  autoEndAt = getAutoEndDate(state, maxRuntimeMinutes);
  isAutoEndDue =
    state.status === "running" && autoEndAt && Date.now() >= autoEndAt.getTime();
  state = await updateState({
    lastWatchdogAt: checkedAt,
    lastWatchdogAction: actions.join(","),
  });

  return {
    ok: true,
    actions,
    checkedAt: checkedAt.toISOString(),
    statusBefore,
    statusAfter: state.status,
    autoEndAt: autoEndAt?.toISOString?.() || null,
    minutesUntilAutoEnd: getMinutesUntilDate(autoEndAt),
    isAutoEndDue: Boolean(isAutoEndDue),
    didStartAutoEnd,
    lastError: state.lastError || null,
    maxRuntimeMinutes,
    config: getBroadcastServerResponseConfig(),
    state: serializeState(state),
  };
}
