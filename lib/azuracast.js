import { randomBytes } from "crypto";

const REQUEST_TIMEOUT_MS = 12000;
const OPTIONAL_REQUEST_TIMEOUT_MS = 2500;
const ICECAST_REQUEST_TIMEOUT_MS = 5000;
const SOURCE_PASSWORD_LENGTH = 12;

const SERVICE_TYPES = ["frontend"];
const ACTIONS = new Set(["start", "stop", "restart"]);

function cleanEnv(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBaseUrl(value) {
  const cleaned = cleanEnv(value).replace(/\/+$/, "");
  if (!cleaned) return "";
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  return `http://${cleaned}`;
}

function getConfig() {
  const baseUrl = normalizeBaseUrl(process.env.AZURACAST_BASE_URL);
  const stationId = cleanEnv(process.env.AZURACAST_STATION_ID);
  const apiKey = cleanEnv(process.env.AZURACAST_API_KEY);

  const missing = [];
  if (!baseUrl) missing.push("STREAM_SERVICE_BASE_URL");
  if (!stationId) missing.push("STREAM_SERVICE_STATION_ID");
  if (!apiKey) missing.push("STREAM_SERVICE_API_KEY");

  return {
    baseUrl,
    stationId,
    apiKey,
    missing,
    isConfigured: missing.length === 0,
  };
}

function firstEnv(...names) {
  for (const name of names) {
    const value = cleanEnv(process.env[name]);
    if (value) return value;
  }
  return "";
}

function pickDeepValue(source, keyMatchers) {
  const queue = [source];
  const seen = new Set();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    for (const [key, value] of Object.entries(current)) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (
        value !== null &&
        value !== undefined &&
        keyMatchers.some((matcher) => matcher(normalizedKey, value))
      ) {
        return String(value);
      }
      if (value && typeof value === "object") queue.push(value);
    }
  }

  return "";
}

function pickMount(source) {
  const mounts = [
    source?.mounts,
    source?.mount_points,
    source?.mountPoints,
    source?.station?.mount,
    source?.station?.mounts,
    source?.station?.mount_points,
    source?.station?.mountPoints,
    source?.now_playing?.station?.mount,
    source?.now_playing?.station?.mounts,
    source?.now_playing?.station?.mount_points,
    source?.now_playing?.station?.mountPoints,
  ].find((value) => Array.isArray(value));

  const firstMount = mounts?.find((mount) => mount?.is_default) || mounts?.[0];
  const mount =
    firstMount?.name ||
    firstMount?.mount ||
    firstMount?.mount_point ||
    firstMount?.mountPoint ||
    firstMount?.path ||
    firstMount?.url ||
    "";

  if (mount) return normalizeMount(mount);

  const directMount = pickDeepValue(source, [
    (key) =>
      key === "mount" ||
      key === "mountpoint" ||
      key === "mounturl" ||
      key === "listenurl" ||
      key === "listenurlssl" ||
      key === "publicplayerurl" ||
      key === "streamerurl" ||
      key === "streamurl",
  ]);

  return normalizeMount(directMount);
}

function normalizeMount(value) {
  const cleaned = cleanEnv(value);
  if (!cleaned) return "";

  try {
    const parsed = new URL(cleaned);
    return parsed.pathname || "";
  } catch {
    return cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  }
}

function generateSourcePassword(length = SOURCE_PASSWORD_LENGTH) {
  return randomBytes(Math.ceil(length * 0.75))
    .toString("base64url")
    .slice(0, length);
}

function inferLiveSourceFromStation(data) {
  if (!data) return {};

  const port = pickDeepValue(data, [
    (key) =>
      key === "port" ||
      key === "frontendport" ||
      key === "streamingport" ||
      key === "icecastport" ||
      key === "shoutcastport",
  ]);
  const username = pickDeepValue(data, [
    (key) =>
      key === "sourceusername" ||
      key === "streamusername" ||
      key === "username",
  ]);
  const password = pickDeepValue(data, [
    (key) =>
      key === "sourcepassword" ||
      key === "sourcepw" ||
      key === "streampassword" ||
      key === "encoderpassword",
  ]);
  const mount = pickMount(data);

  return {
    port,
    username,
    password,
    mount,
  };
}

function mergeLiveSource(...sources) {
  return sources.reduce(
    (merged, source) => ({
      port: merged.port || source?.port || "",
      username: merged.username || source?.username || "",
      password: merged.password || source?.password || "",
      mount: merged.mount || source?.mount || "",
    }),
    { port: "", username: "", password: "", mount: "" },
  );
}

function parseNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function extractIcecastListenerStats(data, preferredMount = "") {
  const sources = data?.icestats?.source;
  const sourceList = Array.isArray(sources) ? sources : sources ? [sources] : [];
  const normalizedMount = cleanEnv(preferredMount).toLowerCase();
  const selectedSource =
    sourceList.find((source) => {
      const listenUrl = cleanEnv(source?.listenurl).toLowerCase();
      return normalizedMount && listenUrl.includes(normalizedMount);
    }) ||
    sourceList.find((source) => parseNumber(source?.listeners) !== null) ||
    null;

  if (!selectedSource) {
    return {
      current: null,
      unique: null,
      total: null,
      raw: null,
    };
  }

  return {
    current: parseNumber(selectedSource.listeners),
    unique: parseNumber(selectedSource.listener_peak),
    total: parseNumber(selectedSource.listener_peak),
    raw: {
      listeners: selectedSource.listeners ?? null,
      listenerPeak: selectedSource.listener_peak ?? null,
      listenUrl: selectedSource.listenurl ?? null,
    },
  };
}

function buildLiveSourceConfig(inferred = {}) {
  const azuracastConfig = getConfig();
  const host = firstEnv(
    "AZURACAST_STREAM_HOST",
    "AZURACAST_SOURCE_HOST",
    "BUTT_STREAM_HOST",
  );
  const port = firstEnv(
    "AZURACAST_STREAM_PORT",
    "AZURACAST_SOURCE_PORT",
    "BUTT_STREAM_PORT",
  ) || inferred.port;
  const password = firstEnv(
    "AZURACAST_STREAM_PASSWORD",
    "AZURACAST_SOURCE_PASSWORD",
    "BUTT_STREAM_PASSWORD",
  );
  const shouldPreferApiPassword =
    cleanEnv(process.env.BROADCAST_SERVER_ROTATE_SOURCE_PASSWORD)
      .toLowerCase() !== "false";
  const effectivePassword =
    shouldPreferApiPassword && inferred.password
      ? inferred.password
      : password || inferred.password;
  const username = firstEnv(
    "AZURACAST_STREAM_USERNAME",
    "AZURACAST_SOURCE_USERNAME",
    "BUTT_STREAM_USERNAME",
  ) || inferred.username || (effectivePassword ? "source" : "");
  const mount = firstEnv(
    "AZURACAST_STREAM_MOUNT",
    "AZURACAST_SOURCE_MOUNT",
    "BUTT_STREAM_MOUNT",
  ) || inferred.mount;

  const inferredHost = azuracastConfig.baseUrl
    ? new URL(azuracastConfig.baseUrl).hostname
    : "";

  const missing = [];
  if (!host && !inferredHost) missing.push("AZURACAST_STREAM_HOST");
  if (!port) missing.push("AZURACAST_STREAM_PORT");
  if (!username) missing.push("AZURACAST_STREAM_USERNAME");
  if (!effectivePassword) missing.push("AZURACAST_STREAM_PASSWORD");

  return {
    host: host || inferredHost || null,
    port: port || null,
    username: username || null,
    password: effectivePassword || null,
    mount: mount || null,
    source: {
      host: host ? "env" : inferredHost ? "azuracast_base_url" : null,
      port: port ? (inferred.port && !firstEnv("AZURACAST_STREAM_PORT", "AZURACAST_SOURCE_PORT", "BUTT_STREAM_PORT") ? "azuracast_api" : "env") : null,
      username: username ? (inferred.username && !firstEnv("AZURACAST_STREAM_USERNAME", "AZURACAST_SOURCE_USERNAME", "BUTT_STREAM_USERNAME") ? "azuracast_api" : effectivePassword ? "default_icecast" : "env") : null,
      password: effectivePassword ? (inferred.password && (shouldPreferApiPassword || !firstEnv("AZURACAST_STREAM_PASSWORD", "AZURACAST_SOURCE_PASSWORD", "BUTT_STREAM_PASSWORD")) ? "azuracast_api" : "env") : null,
      mount: mount ? (inferred.mount && !firstEnv("AZURACAST_STREAM_MOUNT", "AZURACAST_SOURCE_MOUNT", "BUTT_STREAM_MOUNT") ? "azuracast_api" : "env") : null,
    },
    isConfigured: missing.length === 0,
    missing,
  };
}

async function firstSuccessfulAzuraCastRequest(paths, errorMessage) {
  const config = getConfig();
  const results = await Promise.allSettled(
    paths.map((path) =>
      requestAzuraCast(path.replace("{stationId}", config.stationId), {
        timeoutMs: OPTIONAL_REQUEST_TIMEOUT_MS,
      }),
    ),
  );

  const fulfilled = results.find((result) => result.status === "fulfilled");
  if (fulfilled) return fulfilled.value;

  const error = new Error(errorMessage);
  error.status = 502;
  error.code = "AZURACAST_OPTIONAL_DETAILS_UNAVAILABLE";
  error.payload = {
    errors: results
      .filter((result) => result.status === "rejected")
      .map((result, index) => ({
        path: paths[index].replace("{stationId}", config.stationId),
        status: result.reason?.status || null,
        message: result.reason?.message || "Request failed",
      })),
  };
  throw error;
}

async function getAzuraCastStationDetails() {
  return firstSuccessfulAzuraCastRequest(
    [
      "/api/admin/station/{stationId}",
      "/api/station/{stationId}/profile",
      "/api/station/{stationId}",
    ],
    "Unable to fetch stream station details",
  );
}

function normalizeList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.records)) return value.records;
  if (Array.isArray(value?.mounts)) return value.mounts;
  if (Array.isArray(value?.mount_points)) return value.mount_points;
  if (Array.isArray(value?.mountPoints)) return value.mountPoints;
  return [];
}

function pickDefaultMount(mounts) {
  return (
    mounts.find((mount) => mount?.is_default || mount?.isDefault) ||
    mounts.find((mount) => mount?.name || mount?.mount || mount?.mount_point) ||
    mounts[0] ||
    null
  );
}

async function getAzuraCastMounts() {
  const config = getConfig();
  const data = await firstSuccessfulAzuraCastRequest(
    [
      "/api/station/{stationId}/mounts",
      "/api/station/{stationId}/mount-points",
      "/api/admin/station/{stationId}/mounts",
    ],
    "Unable to fetch stream mount details",
  );

  return normalizeList(data).map((mount) => ({
    ...mount,
    id: mount?.id ?? mount?.mount_id ?? mount?.mountId ?? mount?.name,
    station_id: mount?.station_id ?? config.stationId,
  }));
}

async function getAzuraCastNowPlayingDetails() {
  const config = getConfig();
  const data = await firstSuccessfulAzuraCastRequest(
    [
      "/api/nowplaying/{stationId}",
      "/api/nowplaying_static/{stationId}.json",
      "/api/nowplaying",
    ],
    "Unable to fetch stream now playing details",
  );

  if (Array.isArray(data)) {
    return (
      data.find((station) => {
        const ids = [
          station?.station?.id,
          station?.station?.shortcode,
          station?.station?.short_name,
          station?.station_id,
          station?.id,
        ]
          .filter((value) => value !== undefined && value !== null)
          .map(String);

        return ids.includes(config.stationId);
      }) ||
      data[0] ||
      null
    );
  }

  return data;
}

function normalizeServiceStatus(value) {
  if (typeof value === "boolean") return value ? "running" : "stopped";
  if (typeof value === "number") return value > 0 ? "running" : "stopped";
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const status =
      value.status ||
      value.state ||
      value.health ||
      value.health_status ||
      value.service_status;

    if (status) return normalizeServiceStatus(status);
    if ("running" in value) return normalizeServiceStatus(value.running);
    if ("is_running" in value) return normalizeServiceStatus(value.is_running);
    if ("online" in value) return normalizeServiceStatus(value.online);
    if ("is_online" in value) return normalizeServiceStatus(value.is_online);
  }
  return "unknown";
}

function looksLikeBackendService(service) {
  const text = [
    service?.name,
    service?.key,
    service?.type,
    service?.service,
    service?.id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    text.includes("backend") ||
    text.includes("liquidsoap") ||
    text.includes("broadcast")
  );
}

function looksLikeFrontendService(service) {
  const text = [
    service?.name,
    service?.key,
    service?.type,
    service?.service,
    service?.id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    text.includes("frontend") ||
    text.includes("icecast") ||
    text.includes("shoutcast") ||
    text.includes("radio")
  );
}

function extractFromServiceArray(services) {
  const backend = services.find(looksLikeBackendService);
  const frontend = services.find(looksLikeFrontendService);

  if (!backend && !frontend) return null;

  return {
    backend: normalizeServiceStatus(backend),
    frontend: normalizeServiceStatus(frontend),
  };
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function extractServices(data) {
  if (Array.isArray(data)) {
    const services = extractFromServiceArray(data);
    if (services) return services;
  }

  const candidates = [
    data?.services,
    data?.service,
    data?.serviceStatus,
    data?.service_status,
    data?.serviceStatuses,
    data?.service_statuses,
    data?.status,
    data,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const services = extractFromServiceArray(candidate);
      if (services) return services;
      continue;
    }

    const backend = firstDefined(
      candidate.backend,
      candidate.broadcasting,
      candidate.liquidsoap,
      candidate.streamer,
      candidate.backend_running,
      candidate.backendRunning,
      candidate.is_backend_running,
      candidate.isBackendRunning,
      candidate.station_has_started,
      candidate.stationHasStarted,
    );
    const frontend = firstDefined(
      candidate.frontend,
      candidate.radio,
      candidate.icecast,
      candidate.shoutcast,
      candidate.frontend_running,
      candidate.frontendRunning,
      candidate.is_frontend_running,
      candidate.isFrontendRunning,
    );

    if (backend !== undefined || frontend !== undefined) {
      return {
        backend: normalizeServiceStatus(backend),
        frontend: normalizeServiceStatus(frontend),
      };
    }
  }

  return {
    backend: "unknown",
    frontend: "unknown",
  };
}

async function requestAzuraCastUrl(url, config, path, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || REQUEST_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      timeoutMs: undefined,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) {
      const message =
        data?.message ||
        data?.error ||
        `Stream service request failed with status ${res.status}`;
      const error = new Error(message);
      error.status = res.status;
      error.payload = data;
      throw error;
    }

      return data;
    } catch (error) {
      if (error.name === "AbortError") {
        const timeoutError = new Error(`Stream service request timed out: ${path}`);
        timeoutError.status = 504;
        timeoutError.code = "AZURACAST_TIMEOUT";
        throw timeoutError;
    }
    if (error instanceof SyntaxError) {
      const parseError = new Error("Stream service returned invalid JSON");
      parseError.status = 502;
      parseError.code = "AZURACAST_INVALID_JSON";
      throw parseError;
    }
    throw error;
  } finally {
      clearTimeout(timeoutId);
    }
  }

async function requestAzuraCast(path, options = {}) {
  const config = getConfig();
  if (!config.isConfigured) {
    const error = new Error(
      `Missing stream service environment variables: ${config.missing.join(", ")}`,
    );
    error.status = 500;
    error.code = "AZURACAST_CONFIG_MISSING";
    throw error;
  }

  return requestAzuraCastUrl(`${config.baseUrl}${path}`, config, path, options);
}

async function tryRotateMountSourcePassword(password) {
  const config = getConfig();
  const mounts = await getAzuraCastMounts();
  const mount = pickDefaultMount(mounts);
  if (!mount?.id) {
    const error = new Error("Stream mount ID was not found");
    error.status = 502;
    throw error;
  }

  const body = {
    ...mount,
    source_pw: password,
    source_password: password,
    sourcePassword: password,
    streamer_password: password,
    streamerPassword: password,
    frontend_config: {
      ...(mount.frontend_config || mount.frontendConfig || {}),
      source_pw: password,
      source_password: password,
    },
  };
  const mountId = encodeURIComponent(String(mount.id));
  const paths = [
    `/api/station/${config.stationId}/mount/${mountId}`,
    `/api/station/${config.stationId}/mounts/${mountId}`,
    `/api/station/${config.stationId}/mount-point/${mountId}`,
    `/api/station/${config.stationId}/mount-points/${mountId}`,
  ];
  const methods = ["PUT", "PATCH"];
  const errors = [];

  for (const path of paths) {
    for (const method of methods) {
      try {
        await requestAzuraCast(path, {
          method,
          body: JSON.stringify(body),
        });
        return { target: "mount", mountId: String(mount.id), path, method };
      } catch (error) {
        errors.push({
          path,
          method,
          status: error.status || null,
          message: error.message || "Request failed",
        });
      }
    }
  }

  const error = new Error("Unable to update stream mount source password");
  error.status = 502;
  error.code = "AZURACAST_SOURCE_PASSWORD_ROTATE_FAILED";
  error.payload = { errors };
  throw error;
}

async function tryRotateStationSourcePassword(password) {
  const config = getConfig();
  const station = await getAzuraCastStationDetails().catch(() => ({}));
  const body = {
    ...station,
    source_pw: password,
    source_password: password,
    sourcePassword: password,
    streamer_password: password,
    streamerPassword: password,
    frontend_config: {
      ...(station.frontend_config || station.frontendConfig || {}),
      source_pw: password,
      source_password: password,
    },
  };
  const paths = [
    `/api/admin/station/${config.stationId}`,
    `/api/station/${config.stationId}/profile`,
    `/api/station/${config.stationId}`,
  ];
  const methods = ["PUT", "PATCH"];
  const errors = [];

  for (const path of paths) {
    for (const method of methods) {
      try {
        await requestAzuraCast(path, {
          method,
          body: JSON.stringify(body),
        });
        return { target: "station", path, method };
      } catch (error) {
        errors.push({
          path,
          method,
          status: error.status || null,
          message: error.message || "Request failed",
        });
      }
    }
  }

  const error = new Error("Unable to update stream station source password");
  error.status = 502;
  error.code = "AZURACAST_STATION_PASSWORD_ROTATE_FAILED";
  error.payload = { errors };
  throw error;
}

async function requestJsonUrl(url, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || OPTIONAL_REQUEST_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      timeoutMs: undefined,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...options.headers,
      },
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) {
      const error = new Error(`Request failed with status ${res.status}`);
      error.status = res.status;
      error.payload = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("Request timed out");
      timeoutError.status = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getIcecastListenerStats(liveSource) {
  const config = getConfig();
  const baseUrl = new URL(config.baseUrl);
  const host = liveSource?.host || baseUrl.hostname;
  const port = liveSource?.port;
  const mount = liveSource?.mount || "";
  const urls = [
    port ? `${baseUrl.protocol}//${host}:${port}/status-json.xsl` : "",
    port ? `${config.baseUrl}/radio/${port}/status-json.xsl` : "",
    `${config.baseUrl}/status-json.xsl`,
  ].filter(Boolean);

  const results = await Promise.allSettled(
    urls.map((url) =>
      requestJsonUrl(url, { timeoutMs: ICECAST_REQUEST_TIMEOUT_MS }),
    ),
  );
  const fulfilled = results.find((result) => result.status === "fulfilled");
  if (!fulfilled) {
    return {
      current: null,
      unique: null,
      total: null,
      raw: null,
      errors: results.map((result, index) => ({
        url: urls[index],
        status:
          result.status === "rejected" ? result.reason?.status || null : null,
        message:
          result.status === "rejected"
            ? result.reason?.message || "Request failed"
            : null,
      })),
    };
  }

  return {
    ...extractIcecastListenerStats(fulfilled.value, mount),
    errors: [],
  };
}

export function getAzuraCastPublicConfig() {
  const config = getConfig();
  return {
    baseUrl: config.baseUrl || null,
    stationId: config.stationId || null,
    isConfigured: config.isConfigured,
    missing: config.missing,
  };
}

export function getAzuraCastDashboardConfig() {
  return {
    ...getAzuraCastPublicConfig(),
    liveSource: buildLiveSourceConfig(),
  };
}

export async function getAzuraCastDashboardConfigWithStationDetails() {
  try {
    const [stationDetails, nowPlayingDetails] = await Promise.allSettled([
      getAzuraCastStationDetails(),
      getAzuraCastNowPlayingDetails(),
    ]);
    const inferred = mergeLiveSource(
      inferLiveSourceFromStation(
        stationDetails.status === "fulfilled" ? stationDetails.value : null,
      ),
      inferLiveSourceFromStation(
        nowPlayingDetails.status === "fulfilled" ? nowPlayingDetails.value : null,
      ),
    );

    return {
      ...getAzuraCastPublicConfig(),
      liveSource: buildLiveSourceConfig(inferred),
    };
  } catch (error) {
    return {
      ...getAzuraCastDashboardConfig(),
      liveSourceError: error.message,
      liveSourceErrorPayload: error.payload || null,
    };
  }
}

export async function getAzuraCastStatus() {
  const config = getConfig();
  const data = await requestAzuraCast(`/api/station/${config.stationId}/status`);
  const services = extractServices(data);

  return {
    stationId: config.stationId,
    services,
    raw: data,
    checkedAt: new Date().toISOString(),
  };
}

export async function getAzuraCastListenerStats() {
  try {
    const stationDetailsResult = await Promise.allSettled([
      getAzuraCastStationDetails(),
    ]);
    const stationDetails =
      stationDetailsResult[0].status === "fulfilled"
        ? stationDetailsResult[0].value
        : null;
    const liveSource = buildLiveSourceConfig(
      inferLiveSourceFromStation(stationDetails),
    );
    const icecastStats = await getIcecastListenerStats(liveSource).catch(
      (error) => ({
        current: null,
        unique: null,
        total: null,
        raw: null,
        errors: [{ message: error.message || "Icecast request failed" }],
      }),
    );

    if (icecastStats?.current !== null && icecastStats?.current !== undefined) {
      return {
        ...icecastStats,
        checkedAt: new Date().toISOString(),
        source: "icecast_status_json",
      };
    }

    return {
      current: null,
      unique: null,
      total: null,
      checkedAt: new Date().toISOString(),
      source: "icecast_status_json",
      error: icecastStats?.errors?.[0]?.message || "Icecast stats unavailable",
    };
  } catch (error) {
    return {
      current: null,
      unique: null,
      total: null,
      checkedAt: new Date().toISOString(),
      source: "unavailable",
      error: error.message,
    };
  }
}

export async function rotateAzuraCastSourcePassword() {
  const password = generateSourcePassword();
  const mountErrors = [];

  try {
    const result = await tryRotateMountSourcePassword(password);
    await runAzuraCastAction("restart").catch((error) => ({
      warning: error.message,
    }));
    return {
      password,
      ...result,
      rotatedAt: new Date().toISOString(),
    };
  } catch (error) {
    mountErrors.push(error.payload || { message: error.message });
  }

  try {
    const result = await tryRotateStationSourcePassword(password);
    await runAzuraCastAction("restart").catch((error) => ({
      warning: error.message,
    }));
    return {
      password,
      ...result,
      rotatedAt: new Date().toISOString(),
    };
  } catch (error) {
    const rotateError = new Error(
      "Failed to rotate stream source password",
    );
    rotateError.status = 502;
    rotateError.code = "AZURACAST_SOURCE_PASSWORD_ROTATE_FAILED";
    rotateError.payload = {
      mountErrors,
      stationErrors: error.payload || { message: error.message },
    };
    throw rotateError;
  }
}

export async function runAzuraCastAction(action) {
  if (!ACTIONS.has(action)) {
    const error = new Error("Invalid stream service action");
    error.status = 400;
    throw error;
  }

  const config = getConfig();
  const results = [];
  const errors = [];

  for (const service of SERVICE_TYPES) {
    const path = `/api/station/${config.stationId}/${service}/${action}`;
    try {
      const data = await requestAzuraCast(path, { method: "POST" });
      results.push({ service, action, ok: true, response: data });
    } catch (error) {
      const unsupported =
        error.status === 400 &&
        String(error.message || "")
          .toLowerCase()
          .includes("does not currently support this functionality");

      if (service === "backend" && unsupported) {
        results.push({
          service,
          action,
          ok: false,
          skipped: true,
          reason: "Backend/AutoDJ service is not supported for this station.",
        });
        continue;
      }

      errors.push({
        service,
        action,
        status: error.status || 500,
        message: error.message || "Stream service action failed",
        payload: error.payload || null,
      });
    }
  }

  if (!results.some((result) => result.ok)) {
    const error = new Error(errors[0]?.message || "Stream service action failed");
    error.status = errors[0]?.status || 500;
    error.payload = { errors, results };
    throw error;
  }

  return {
    stationId: config.stationId,
    action,
    results,
    errors,
    ranAt: new Date().toISOString(),
  };
}
