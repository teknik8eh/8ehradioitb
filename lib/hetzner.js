const API_BASE_URL = "https://api.hetzner.cloud/v1";
const REQUEST_TIMEOUT_MS = 15000;
const REQUEST_RETRIES = 3;

const TRANSIENT_STATUSES = new Set([
  "creating",
  "booting",
  "ending",
  "snapshotting",
  "deleting",
]);

function cleanEnv(value) {
  return typeof value === "string" ? value.trim() : "";
}

function splitIds(value) {
  return cleanEnv(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function decodeBase64(value) {
  const cleaned = cleanEnv(value);
  if (!cleaned) return "";
  try {
    return Buffer.from(cleaned, "base64").toString("utf8");
  } catch {
    return "";
  }
}

function getHetznerConfig() {
  const token = cleanEnv(process.env.HETZNER_API_TOKEN);
  const serverType = cleanEnv(process.env.HETZNER_SERVER_TYPE);
  const serverTypeFallbacks = splitIds(process.env.HETZNER_SERVER_TYPE_FALLBACKS);
  const location = cleanEnv(process.env.HETZNER_LOCATION);
  const locationFallbacks = splitIds(process.env.HETZNER_LOCATION_FALLBACKS);
  const seedSnapshotId = cleanEnv(process.env.HETZNER_IMAGE_SNAPSHOT_ID);
  const serverNamePrefix =
    cleanEnv(process.env.HETZNER_SERVER_NAME_PREFIX) || "8eh-broadcast";
  const sshKeyIds = splitIds(process.env.HETZNER_SSH_KEY_IDS);
  const firewallIds = splitIds(process.env.HETZNER_FIREWALL_IDS);
  const networkId = cleanEnv(process.env.HETZNER_NETWORK_ID);
  const userData =
    process.env.HETZNER_USER_DATA || decodeBase64(process.env.HETZNER_USER_DATA_BASE64);

  const missing = [];
  if (!token) missing.push("SERVER_PROVIDER_API_TOKEN");
  if (!serverType) missing.push("SERVER_PROVIDER_TYPE");
  if (!location) missing.push("SERVER_PROVIDER_LOCATION");
  if (!seedSnapshotId) missing.push("SERVER_PROVIDER_SNAPSHOT_ID");

  return {
    token,
    serverType,
    serverTypeFallbacks,
    location,
    locationFallbacks,
    seedSnapshotId,
    serverNamePrefix,
    sshKeyIds,
    firewallIds,
    networkId,
    userData,
    missing,
    isConfigured: missing.length === 0,
  };
}

function publicHetznerConfig() {
  const config = getHetznerConfig();
  return {
    serverType: config.serverType || null,
    serverTypeFallbacks: config.serverTypeFallbacks,
    location: config.location || null,
    locationFallbacks: config.locationFallbacks,
    serverNamePrefix: config.serverNamePrefix,
    hasSeedSnapshot: Boolean(config.seedSnapshotId),
    hasSshKeys: config.sshKeyIds.length > 0,
    hasFirewalls: config.firewallIds.length > 0,
    hasNetwork: Boolean(config.networkId),
    hasUserData: Boolean(config.userData),
    isConfigured: config.isConfigured,
    missing: config.missing,
  };
}

function isCapacityError(error) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.payload?.error?.code || error?.code || "").toLowerCase();
  return (
    error?.status === 400 ||
    error?.status === 409 ||
    error?.status === 422
  ) && (
    code.includes("resource_unavailable") ||
    code.includes("unavailable") ||
    code.includes("capacity") ||
    message.includes("unavailable") ||
    message.includes("capacity") ||
    message.includes("temporarily") ||
    message.includes("not enough")
  ) && !message.includes("disk is bigger");
}

function getCreateServerCandidates(config) {
  const serverTypes = uniqueValues([
    config.serverType,
    ...config.serverTypeFallbacks,
  ]);
  const locations = uniqueValues([config.location, ...config.locationFallbacks]);
  const candidates = [];

  for (const location of locations) {
    for (const serverType of serverTypes) {
      candidates.push({ serverType, location });
    }
  }

  return candidates;
}

function createError(message, status = 500, code = "HETZNER_ERROR", payload) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.payload = payload || null;
  return error;
}

async function requestHetzner(path, options = {}) {
  const config = getHetznerConfig();
  if (!config.token) {
    throw createError(
      "Missing server provider API token",
      500,
      "HETZNER_CONFIG_MISSING",
    );
  }

  let lastError = null;

  for (let attempt = 1; attempt <= REQUEST_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${config.token}`,
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...options.headers,
        },
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        const message =
          data?.error?.message ||
          data?.message ||
          `Server provider request failed with status ${res.status}`;
        throw createError(message, res.status, "HETZNER_REQUEST_FAILED", data);
      }

      return data;
    } catch (error) {
      lastError = error;
      const retryable =
        error.name === "AbortError" ||
        error.cause?.code === "UND_ERR_CONNECT_TIMEOUT" ||
        error.code === "UND_ERR_CONNECT_TIMEOUT";

      if (error instanceof SyntaxError) {
        throw createError(
          "Server provider returned invalid JSON",
          502,
          "HETZNER_INVALID_JSON",
        );
      }

      if (!retryable || attempt === REQUEST_RETRIES) {
        if (error.name === "AbortError") {
          throw createError("Server provider request timed out", 504, "HETZNER_TIMEOUT");
        }
        if (
          error.cause?.code === "UND_ERR_CONNECT_TIMEOUT" ||
          error.code === "UND_ERR_CONNECT_TIMEOUT"
        ) {
          throw createError(
            "Could not connect to server provider API after multiple attempts",
            504,
            "HETZNER_CONNECT_TIMEOUT",
          );
        }
        throw error;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError || createError("Server provider request failed");
}

function getServerIp(server) {
  return (
    server?.public_net?.ipv4?.ip ||
    server?.public_net?.ipv6?.ip ||
    null
  );
}

export function getBroadcastServerPublicConfig() {
  return publicHetznerConfig();
}

export function getSeedSnapshotId() {
  return getHetznerConfig().seedSnapshotId;
}

export function isTransientBroadcastStatus(status) {
  return TRANSIENT_STATUSES.has(status);
}

export async function createServerFromSnapshot(snapshotId) {
  const config = getHetznerConfig();
  if (!config.isConfigured) {
    throw createError(
      `Missing server provider environment variables: ${config.missing.join(", ")}`,
      500,
      "HETZNER_CONFIG_MISSING",
    );
  }

  const name = `${config.serverNamePrefix}-${Date.now()}`;
  const candidates = getCreateServerCandidates(config);
  const errors = [];
  let data = null;
  let selectedCandidate = null;

  for (const candidate of candidates) {
    const body = {
      name,
      server_type: candidate.serverType,
      image: snapshotId,
      location: candidate.location,
      start_after_create: true,
    };

    if (config.sshKeyIds.length > 0) body.ssh_keys = config.sshKeyIds;
    if (config.firewallIds.length > 0) {
      body.firewalls = config.firewallIds.map((id) => ({ firewall: id }));
    }
    if (config.networkId) body.networks = [config.networkId];
    if (config.userData) body.user_data = config.userData;

    try {
      data = await requestHetzner("/servers", {
        method: "POST",
        body: JSON.stringify(body),
      });
      selectedCandidate = candidate;
      break;
    } catch (error) {
      errors.push({
        serverType: candidate.serverType,
        location: candidate.location,
        status: error.status || null,
        message: error.message || "Server provider create server failed",
      });

      if (!isCapacityError(error)) throw error;
    }
  }

  if (!data) {
    throw createError(
      "All server type/location fallbacks are unavailable",
      503,
      "HETZNER_FALLBACKS_UNAVAILABLE",
      { errors },
    );
  }

  if (!data?.server?.id) {
    throw createError(
      "Server provider did not return a server ID",
      502,
      "HETZNER_SERVER_ID_MISSING",
      data,
    );
  }

  return {
    serverId: String(data.server.id),
    serverName: data.server.name,
    publicIp: getServerIp(data.server),
    serverType: selectedCandidate?.serverType || config.serverType,
    location: selectedCandidate?.location || config.location,
    fallbackAttempts: errors,
    raw: data,
  };
}

export async function getServer(serverId) {
  const data = await requestHetzner(`/servers/${serverId}`);
  return {
    id: String(data.server.id),
    name: data.server.name,
    status: data.server.status,
    publicIp: getServerIp(data.server),
    raw: data.server,
  };
}

export async function createSnapshot(serverId) {
  const data = await requestHetzner(`/servers/${serverId}/actions/create_image`, {
    method: "POST",
    body: JSON.stringify({
      type: "snapshot",
      description: `8EH broadcast snapshot ${new Date().toISOString()}`,
    }),
  });

  return {
    actionId: data.action?.id ? String(data.action.id) : null,
    snapshotId: data.image?.id ? String(data.image.id) : null,
    raw: data,
  };
}

export async function getImage(imageId) {
  const data = await requestHetzner(`/images/${imageId}`);
  return {
    id: String(data.image.id),
    status: data.image.status,
    name: data.image.name,
    raw: data.image,
  };
}

export async function deleteServer(serverId) {
  await requestHetzner(`/servers/${serverId}`, { method: "DELETE" });
  return { serverId: String(serverId), deleted: true };
}

export async function deleteImage(imageId) {
  await requestHetzner(`/images/${imageId}`, { method: "DELETE" });
  return { imageId: String(imageId), deleted: true };
}
