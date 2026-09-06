"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  FiAlertTriangle,
  FiCopy,
  FiEye,
  FiEyeOff,
  FiHeadphones,
  FiPlay,
  FiRefreshCw,
  FiRotateCw,
  FiServer,
  FiSquare,
} from "react-icons/fi";
import { hasAnyRole } from "@/lib/roleUtils";

const ACTIONS = [
  {
    id: "start",
    label: "Start",
    confirm: "START",
    icon: FiPlay,
    buttonClass: "bg-green-600 hover:bg-green-700 text-white",
  },
  {
    id: "stop",
    label: "Stop",
    confirm: "STOP",
    icon: FiSquare,
    buttonClass: "bg-red-600 hover:bg-red-700 text-white",
  },
  {
    id: "restart",
    label: "Restart",
    confirm: "RESTART",
    icon: FiRotateCw,
    buttonClass: "bg-gray-900 hover:bg-black text-white",
  },
  {
    id: "rotate-password",
    label: "Rotate Password",
    confirm: "ROTATE",
    icon: FiRotateCw,
    buttonClass: "bg-blue-600 hover:bg-blue-700 text-white",
  },
];

function statusTone(status) {
  if (status === "online") return "bg-green-50 text-green-800 border-green-200";
  if (status === "offline") return "bg-red-50 text-red-800 border-red-200";
  return "bg-yellow-50 text-yellow-800 border-yellow-200";
}

function statusDotTone(status) {
  if (status === "online") return "bg-green-500";
  if (status === "offline") return "bg-red-500";
  return "bg-yellow-500";
}

function normalizeStreamStatus(status) {
  const normalized = String(status || "").toLowerCase();
  if (["running", "true", "online", "on", "1"].includes(normalized)) {
    return "online";
  }
  if (["stopped", "false", "offline", "off", "0"].includes(normalized)) {
    return "offline";
  }
  return "checking";
}

function Panel({ children, className = "" }) {
  return (
    <section
      className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

function toDatetimeLocalValue(date) {
  const pad = (value) => String(value).padStart(2, "0");
  const local = new Date(date);
  return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(
    local.getDate(),
  )}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
}

function parseRangeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ListenerChart({ data, range }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const width = 720;
  const height = 220;
  const padding = 28;
  const fromDate = parseRangeDate(range?.from);
  const toDate = parseRangeDate(range?.to);
  const points = data
    .filter((item) => {
      if (typeof item.current !== "number") return false;
      const date = new Date(item.createdAt);
      if (Number.isNaN(date.getTime())) return false;
      if (fromDate && date < fromDate) return false;
      if (toDate && date > toDate) return false;
      return true;
    })
    .map((item) => ({
      value: item.current,
      date: new Date(item.createdAt),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (points.length < 2) {
    return (
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-6 font-body text-sm text-gray-500">
        Belum cukup data untuk grafik. Coba refresh lagi setelah beberapa menit.
      </div>
    );
  }

  const maxValue = Math.max(1, ...points.map((point) => point.value));
  const minTime = points[0].date.getTime();
  const maxTime = points[points.length - 1].date.getTime();
  const timeRange = Math.max(1, maxTime - minTime);
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const coords = points.map((point) => ({
    x: padding + ((point.date.getTime() - minTime) / timeRange) * plotWidth,
    y: padding + (1 - point.value / maxValue) * plotHeight,
    ...point,
  }));
  const path = coords
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full min-w-[520px]"
        role="img"
        aria-label="Listener chart"
      >
        {[0, 0.5, 1].map((tick) => {
          const y = padding + (1 - tick) * plotHeight;
          return (
            <g key={tick}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#f3f4f6"
              />
              <text
                x={padding - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-gray-400 text-[10px]"
              >
                {Math.round(maxValue * tick)}
              </text>
            </g>
          );
        })}
        <path d={path} fill="none" stroke="#2563eb" strokeWidth="3" />
        {coords.map((point, index) => (
          <g key={`${point.date.toISOString()}-${index}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r="8"
              fill="transparent"
              className="cursor-pointer"
              tabIndex={0}
              onMouseEnter={() => setHoveredPoint(point)}
              onMouseLeave={() => setHoveredPoint(null)}
              onFocus={() => setHoveredPoint(point)}
              onBlur={() => setHoveredPoint(null)}
            />
            <circle cx={point.x} cy={point.y} r="3" fill="#2563eb" />
          </g>
        ))}
        {hoveredPoint && (
          <g pointerEvents="none">
            <line
              x1={hoveredPoint.x}
              y1={padding}
              x2={hoveredPoint.x}
              y2={height - padding}
              stroke="#93c5fd"
              strokeDasharray="4 4"
            />
            <rect
              x={Math.min(hoveredPoint.x + 10, width - 210)}
              y={Math.max(hoveredPoint.y - 58, 8)}
              width="200"
              height="48"
              rx="6"
              fill="#111827"
            />
            <text
              x={Math.min(hoveredPoint.x + 22, width - 198)}
              y={Math.max(hoveredPoint.y - 36, 30)}
              className="fill-white text-[11px] font-bold"
            >
              {hoveredPoint.value} listeners
            </text>
            <text
              x={Math.min(hoveredPoint.x + 22, width - 198)}
              y={Math.max(hoveredPoint.y - 18, 48)}
              className="fill-gray-300 text-[10px]"
            >
              {hoveredPoint.date.toLocaleString()}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

function CredentialRow({ label, value, onCopy }) {
  return (
    <div className="rounded-md border border-gray-200 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <p className="flex-1 break-all font-body text-sm text-gray-900">
          {value || "Not configured"}
        </p>
        {value && (
          <button
            type="button"
            onClick={() => onCopy(value)}
            className="rounded-md border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
            title={`Copy ${label}`}
          >
            <FiCopy size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function LiveStreamDashboard() {
  const { data: session, status: sessionStatus } = useSession();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmText, setConfirmText] = useState("");
  const [showSourcePassword, setShowSourcePassword] = useState(false);
  const [listenerHistory, setListenerHistory] = useState([]);
  const [listenerRange, setListenerRange] = useState(() => {
    const now = new Date();
    const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return {
      from: toDatetimeLocalValue(from),
      to: toDatetimeLocalValue(now),
    };
  });

  const canManage =
    session && hasAnyRole(session.user.role, ["DEVELOPER", "TECHNIC"]);
  const config = payload?.config || {};
  const broadcastServer = payload?.broadcastServer || {};
  const isBroadcastServerRunning = broadcastServer?.isRunning !== false;
  const isLocked = payload?.locked || !isBroadcastServerRunning;
  const liveSource = config?.liveSource || {};
  const serviceStatus = payload?.status?.services || {};
  const listenerStats = payload?.listeners || {};
  const lastChecked = payload?.status?.checkedAt;
  const streamStatus = normalizeStreamStatus(serviceStatus.frontend);

  const selectedAction = useMemo(
    () => ACTIONS.find((action) => action.id === confirmAction),
    [confirmAction],
  );

  const fetchStatus = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/azuracast/status", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        if (data?.config || data?.broadcastServer) {
          setPayload((prev) => ({
            ...prev,
            config: data.config || prev?.config,
            broadcastServer: data.broadcastServer || prev?.broadcastServer,
            locked: data.locked ?? prev?.locked,
            lockReason: data.lockReason || prev?.lockReason,
          }));
        }
        throw new Error(data?.error || "Failed to fetch status.");
      }
      setPayload(data);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchListenerHistory = async (range = listenerRange) => {
    try {
      const params = new URLSearchParams();
      if (range?.from) params.set("from", new Date(range.from).toISOString());
      if (range?.to) params.set("to", new Date(range.to).toISOString());
      if (!range?.from && !range?.to) params.set("hours", "24");

      const res = await fetch(`/api/azuracast/listeners?${params}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to fetch listeners.");
      setListenerHistory(data.snapshots || []);
    } catch (err) {
      console.warn("Failed to fetch listener history:", err);
    }
  };

  const setPresetRange = (hours) => {
    const now = new Date();
    const from = new Date(now.getTime() - hours * 60 * 60 * 1000);
    const nextRange = {
      from: toDatetimeLocalValue(from),
      to: toDatetimeLocalValue(now),
    };
    setListenerRange(nextRange);
    fetchListenerHistory(nextRange);
  };

  useEffect(() => {
    if (canManage) {
      fetchStatus();
      fetchListenerHistory();
    }
    if (sessionStatus !== "loading" && !canManage) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage, sessionStatus]);

  const copyValue = async (value) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setSuccess("Copied to clipboard.");
  };

  const openConfirm = (action) => {
    setConfirmAction(action.id);
    setConfirmText("");
    setError("");
    setSuccess("");
  };

  const closeConfirm = () => {
    setConfirmAction(null);
    setConfirmText("");
  };

  const runAction = async () => {
    if (!selectedAction || confirmText !== selectedAction.confirm) return;

    const action = selectedAction;
    setSavingAction(action.id);
    setError("");
    setSuccess(`${action.label} action sent.`);
    closeConfirm();

    try {
      const res = await fetch("/api/azuracast/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: action.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.config) setPayload({ config: data.config });
        throw new Error(data?.error || "Failed to run action.");
      }

      setPayload((prev) => ({
        ...prev,
        config: data.config || prev?.config,
      }));
      if (action.id === "rotate-password") {
        setShowSourcePassword(true);
        setSuccess(
          "Stream password rotated. Update the encoder with the new password.",
        );
      }
      fetchStatus({ silent: true });
      fetchListenerHistory();
    } catch (err) {
      setSuccess("");
      setError(err.message);
    } finally {
      setSavingAction("");
    }
  };

  if (sessionStatus === "loading" || loading) {
    return <div className="p-8 text-center font-body">Loading...</div>;
  }

  if (!canManage) {
    return (
      <div className="p-8 text-center font-body text-red-600">
        Access Denied.
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="mx-auto max-w-3xl">
        <Panel className="p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-yellow-50 text-yellow-700">
            <FiServer size={24} />
          </div>
          <h1 className="mt-4 font-heading text-3xl font-bold text-gray-900">
            Server siaran belum menyala
          </h1>
          <p className="mx-auto mt-2 max-w-xl font-body text-sm text-gray-600">
            Nyalakan server siaran dulu sebelum mengatur live stream atau melihat
            listener realtime.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Link
              href="/dashboard/broadcast-server"
              className="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 font-body font-semibold text-white hover:bg-black"
            >
              Buka Broadcast Control
            </Link>
            <button
              type="button"
              onClick={() => fetchStatus()}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 px-4 py-2 font-body font-semibold text-gray-700 hover:bg-gray-50"
            >
              <FiRefreshCw />
              Refresh
            </button>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Panel className={`border p-6 ${statusTone(streamStatus)}`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-body text-sm font-bold uppercase tracking-wide opacity-70">
              Live Stream
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="font-heading text-3xl font-bold text-gray-900">
                {streamStatus === "online"
                  ? "Online"
                  : streamStatus === "offline"
                    ? "Offline"
                    : "Checking"}
              </h1>
              <span
                className={`inline-flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1 text-xs font-bold ${statusTone(
                  streamStatus,
                )}`}
              >
                <span className={`h-2 w-2 rounded-full ${statusDotTone(streamStatus)}`} />
                {streamStatus}
              </span>
            </div>
            <p className="mt-2 font-body text-sm text-gray-600">
              Pantau stream, listener, dan kredensial live encoder dari sini.
            </p>
            {lastChecked && (
              <p className="mt-2 font-body text-xs text-gray-500">
                Last checked: {new Date(lastChecked).toLocaleString()}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => fetchStatus()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2 font-body font-semibold text-white hover:bg-black disabled:opacity-50"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </Panel>

      {error && (
        <section className="rounded-lg border border-red-100 bg-red-50 p-4 font-body text-sm text-red-700">
          <div className="flex gap-2">
            <FiAlertTriangle className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold">Live stream belum bisa dibaca.</p>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-bold">
                  Technical details
                </summary>
                <p className="mt-2 break-words text-xs">{error}</p>
              </details>
            </div>
          </div>
        </section>
      )}

      {success && (
        <section className="rounded-lg border border-green-100 bg-green-50 p-3 font-body text-sm text-green-700">
          {success}
        </section>
      )}

      {!config?.isConfigured && (
        <section className="rounded-lg border border-yellow-200 bg-yellow-50 p-5 text-yellow-800">
          <h2 className="font-heading text-lg font-bold">
            Konfigurasi live stream belum lengkap
          </h2>
          <details className="mt-2 font-body text-sm">
            <summary className="cursor-pointer font-bold">Lihat detail</summary>
            <p className="mt-2">
              Missing env: {(config?.missing || []).join(", ") || "unknown"}.
            </p>
          </details>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <section className="space-y-6">
          <Panel className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-body text-sm font-bold uppercase tracking-wide text-gray-500">
                  Listener Sekarang
                </p>
                <p className="mt-1 font-heading text-6xl font-bold text-gray-900">
                  {listenerStats.current ?? "-"}
                </p>
              </div>
              <div className="rounded-md bg-gray-50 px-4 py-3 font-body text-sm text-gray-600">
                Peak: <span className="font-bold text-gray-900">{listenerStats.total ?? "-"}</span>
              </div>
            </div>
          </Panel>

          <Panel className="p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-heading text-xl font-bold text-gray-900">
                  Listener Trend
                </h2>
                <p className="font-body text-sm text-gray-500">
                  Default menampilkan 24 jam terakhir.
                </p>
              </div>
              <details className="rounded-md border border-gray-200 bg-gray-50 p-3">
                <summary className="cursor-pointer font-body text-sm font-bold text-gray-700">
                  Filter waktu
                </summary>
                <div className="mt-3 grid grid-cols-1 gap-3">
                  <label className="font-body text-xs font-bold uppercase tracking-wide text-gray-500">
                    From
                    <input
                      type="datetime-local"
                      value={listenerRange.from}
                      onChange={(event) =>
                        setListenerRange((prev) => ({
                          ...prev,
                          from: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-md border border-gray-300 bg-white p-2 font-body text-sm text-gray-900"
                    />
                  </label>
                  <label className="font-body text-xs font-bold uppercase tracking-wide text-gray-500">
                    To
                    <input
                      type="datetime-local"
                      value={listenerRange.to}
                      onChange={(event) =>
                        setListenerRange((prev) => ({
                          ...prev,
                          to: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-md border border-gray-300 bg-white p-2 font-body text-sm text-gray-900"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ["1h", 1],
                      ["6h", 6],
                      ["24h", 24],
                      ["7d", 168],
                    ].map(([label, hours]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setPresetRange(hours)}
                        className="rounded-full border border-gray-200 px-3 py-1.5 font-body text-xs text-gray-600 hover:bg-white"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchListenerHistory(listenerRange)}
                    className="rounded-md bg-blue-600 px-4 py-2 font-body font-semibold text-white hover:bg-blue-700"
                  >
                    Apply
                  </button>
                </div>
              </details>
            </div>
            <ListenerChart data={listenerHistory} range={listenerRange} />
          </Panel>
        </section>

        <aside className="space-y-6">
          <Panel className="p-5">
            <h2 className="font-heading text-xl font-bold text-gray-900">
              Stream Actions
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-2">
              {ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    disabled={!config?.isConfigured || Boolean(savingAction)}
                    onClick={() => openConfirm(action)}
                    className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 font-body font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${action.buttonClass}`}
                  >
                    <Icon />
                    {savingAction === action.id ? "Sending..." : action.label}
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-heading text-xl font-bold text-gray-900">
                  Live Encoder
                </h2>
                <p className="mt-1 font-body text-sm text-gray-500">
                  Pakai data ini di aplikasi encoder.
                </p>
              </div>
              {!liveSource?.isConfigured && (
                <span className="rounded-md border border-yellow-200 bg-yellow-50 px-2 py-1 font-body text-xs text-yellow-800">
                  Missing
                </span>
              )}
            </div>
            <div className="mt-4 space-y-3">
              <CredentialRow label="Host" value={liveSource?.host} onCopy={copyValue} />
              <CredentialRow label="Port" value={liveSource?.port} onCopy={copyValue} />
              <CredentialRow
                label="Username"
                value={liveSource?.username}
                onCopy={copyValue}
              />
              <CredentialRow label="Mount" value={liveSource?.mount} onCopy={copyValue} />
              <div className="rounded-md border border-gray-200 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Password
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <p className="flex-1 break-all font-body text-sm text-gray-900">
                    {liveSource?.password
                      ? showSourcePassword
                        ? liveSource.password
                        : "************"
                      : "Not configured"}
                  </p>
                  {liveSource?.password && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowSourcePassword((value) => !value)}
                        className="rounded-md border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
                        title={
                          showSourcePassword ? "Hide password" : "Show password"
                        }
                      >
                        {showSourcePassword ? (
                          <FiEyeOff size={15} />
                        ) : (
                          <FiEye size={15} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyValue(liveSource.password)}
                        className="rounded-md border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
                        title="Copy password"
                      >
                        <FiCopy size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Panel>
        </aside>
      </div>

      <details className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <summary className="cursor-pointer font-heading text-lg font-bold text-gray-900">
          Advanced Details
        </summary>
        <div className="mt-4 grid grid-cols-1 gap-3 font-body text-sm md:grid-cols-2">
          <CredentialRow label="Raw Stream Status" value={serviceStatus.frontend} onCopy={copyValue} />
          <CredentialRow label="Station ID" value={config?.stationId} onCopy={copyValue} />
          <CredentialRow label="Service URL" value={config?.baseUrl} onCopy={copyValue} />
          <CredentialRow label="Broadcast Status" value={broadcastServer?.status} onCopy={copyValue} />
          <CredentialRow label="Broadcast Phase" value={broadcastServer?.phase} onCopy={copyValue} />
          <CredentialRow
            label="Last Checked"
            value={lastChecked ? new Date(lastChecked).toLocaleString() : ""}
            onCopy={copyValue}
          />
        </div>
      </details>

      {selectedAction && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
            <h2 className="font-heading text-xl font-bold text-gray-900">
              Confirm {selectedAction.label}
            </h2>
            <p className="mt-2 font-body text-sm text-gray-600">
              Type{" "}
              <span className="font-bold text-gray-900">
                {selectedAction.confirm}
              </span>{" "}
              to continue.
            </p>
            {selectedAction.id === "rotate-password" && (
              <p className="mt-3 rounded-md border border-blue-100 bg-blue-50 p-3 font-body text-xs text-blue-700">
                This will generate a new live encoder password. Update the
                encoder after this action finishes.
              </p>
            )}
            <input
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value.toUpperCase())}
              className="mt-4 w-full rounded-md border border-gray-300 bg-white p-3 font-body text-gray-900 focus:border-red-500 focus:ring-2 focus:ring-red-500"
              autoFocus
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeConfirm}
                className="rounded-md border border-gray-300 px-4 py-2 font-body font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  confirmText !== selectedAction.confirm ||
                  savingAction === selectedAction.id
                }
                onClick={runAction}
                className={`rounded-md px-4 py-2 font-body font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${selectedAction.buttonClass}`}
              >
                {savingAction === selectedAction.id
                  ? "Sending..."
                  : selectedAction.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
