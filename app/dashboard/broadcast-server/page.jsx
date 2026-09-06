"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiInfo,
  FiPlay,
  FiRefreshCw,
  FiRotateCw,
  FiServer,
  FiSquare,
} from "react-icons/fi";
import { hasAnyRole } from "@/lib/roleUtils";

const TRANSIENT_STATUSES = new Set([
  "creating",
  "booting",
  "ending",
  "snapshotting",
  "deleting",
]);

const ACTIONS = {
  start: {
    label: "Start Server",
    confirm: "START",
    endpoint: "/api/broadcast-server/start",
    icon: FiPlay,
    className: "bg-green-600 hover:bg-green-700 text-white",
  },
  end: {
    label: "End Broadcast",
    confirm: "END",
    endpoint: "/api/broadcast-server/end",
    icon: FiSquare,
    className: "bg-red-600 hover:bg-red-700 text-white",
  },
  retry: {
    label: "Retry",
    confirm: "RETRY",
    endpoint: "/api/broadcast-server/retry",
    icon: FiRotateCw,
    className: "bg-gray-900 hover:bg-black text-white",
  },
  extend: {
    label: "Extend Time",
    confirm: "EXTEND",
    endpoint: "/api/broadcast-server/extend",
    icon: FiClock,
    className: "bg-blue-600 hover:bg-blue-700 text-white",
  },
};

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function getRuntimeMinutes(startedAt) {
  if (!startedAt) return 0;
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000 / 60),
  );
}

function getUptime(startedAt) {
  const minutes = getRuntimeMinutes(startedAt);
  if (!startedAt) return "-";
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function getMinutesUntil(value) {
  if (!value) return null;
  const minutes = Math.ceil(
    (new Date(value).getTime() - Date.now()) / 1000 / 60,
  );
  return Number.isFinite(minutes) ? minutes : null;
}

function getCanEndBroadcast(state, config) {
  if (state.status !== "running") return false;
  const minRuntime = config.minRuntimeMinutes || 0;
  return !minRuntime || getRuntimeMinutes(state.startedAt) >= minRuntime;
}

function isLikelyNetworkGlitch(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.name === "TypeError" ||
    message.includes("failed to fetch") ||
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("load failed")
  );
}

function getDisplayStatus(status) {
  if (status === "idle") return "Off";
  if (["creating", "booting"].includes(status)) return "Starting";
  if (status === "running") return "Ready";
  if (["ending", "snapshotting", "deleting"].includes(status)) return "Ending";
  if (status === "failed") return "Needs Attention";
  return "Checking";
}

function getStatusCopy(state) {
  if (state.status === "idle") {
    return {
      description: "Tekan Start Server sebelum siaran dimulai.",
      tone: "bg-gray-50 border-gray-200 text-gray-700",
      iconTone: "bg-gray-100 text-gray-700",
    };
  }
  if (["creating", "booting"].includes(state.status)) {
    return {
      description: "Tunggu sampai status Ready sebelum dipakai siaran.",
      tone: "bg-blue-50 border-blue-200 text-blue-800",
      iconTone: "bg-blue-100 text-blue-700",
    };
  }
  if (state.status === "running") {
    return {
      description: "Server aktif. Setelah siaran selesai, tekan End Broadcast.",
      tone: "bg-green-50 border-green-200 text-green-800",
      iconTone: "bg-green-100 text-green-700",
    };
  }
  if (["ending", "snapshotting", "deleting"].includes(state.status)) {
    return {
      description: "Sistem sedang menyimpan data siaran dan mematikan server.",
      tone: "bg-blue-50 border-blue-200 text-blue-800",
      iconTone: "bg-blue-100 text-blue-700",
    };
  }
  if (state.status === "failed") {
    return {
      description: "Proses berhenti. Cek pesan error, lalu Retry jika sudah siap.",
      tone: "bg-red-50 border-red-200 text-red-800",
      iconTone: "bg-red-100 text-red-700",
    };
  }
  return {
    description: "Status server sedang dicek.",
    tone: "bg-yellow-50 border-yellow-200 text-yellow-800",
    iconTone: "bg-yellow-100 text-yellow-700",
  };
}

function getProgressLabel(status) {
  if (["creating", "booting"].includes(status)) return "Menyiapkan server siaran";
  if (status === "running") return "Server siap dipakai";
  if (["ending", "snapshotting", "deleting"].includes(status)) {
    return "Menyimpan data siaran dan mematikan server";
  }
  if (status === "failed") return "Proses butuh perhatian";
  return "Menunggu aksi";
}

function getAutoEndStatus(state, config, minutesUntilAutoEnd) {
  if (!config.watchdogConfigured) return "Monitor belum dikonfigurasi";
  if (["ending", "snapshotting", "deleting"].includes(state.status)) {
    return "Auto End sedang berjalan";
  }
  if (state.status === "failed" && state.autoEndStartedAt) {
    return "Auto End butuh perhatian";
  }
  if (state.status !== "running") return "";
  if (minutesUntilAutoEnd === null) return "Auto End aktif";
  if (minutesUntilAutoEnd <= 0) return "Auto End menunggu monitor";
  return `Auto End aktif, ${minutesUntilAutoEnd} menit lagi`;
}

function getSimpleError(message) {
  if (!message) return "";
  const text = message.toLowerCase();
  if (text.includes("timed out") || text.includes("fetch failed")) {
    return "Koneksi ke server belum stabil. Tunggu sebentar, lalu refresh atau retry.";
  }
  if (text.includes("deleted outside")) {
    return "Server sudah tidak ditemukan. Refresh untuk sinkronkan status.";
  }
  if (text.includes("minimum") || text.includes("at least")) return message;
  return "Ada kendala saat memproses server siaran.";
}

function InfoCard({ label, value, highlight = false }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p
        className={`mt-2 break-all font-body ${
          highlight ? "text-xl font-bold text-gray-900" : "text-gray-900"
        }`}
      >
        {value || "-"}
      </p>
    </div>
  );
}

export default function BroadcastServerPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [runningAction, setRunningAction] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmText, setConfirmText] = useState("");

  const canManage =
    session && hasAnyRole(session.user.role, ["DEVELOPER", "TECHNIC"]);
  const state = payload?.state || {};
  const config = payload?.config || {};
  const isTransient = TRANSIENT_STATUSES.has(state.status);
  const minutesUntilAutoEnd = getMinutesUntil(state.autoEndAt);
  const canExtend =
    state.status === "running" &&
    minutesUntilAutoEnd !== null &&
    minutesUntilAutoEnd <= (config.extendMinutes || 60);
  const selectedAction = confirmAction ? ACTIONS[confirmAction] : null;
  const statusCopy = getStatusCopy(state);
  const simpleError = getSimpleError(error || state.lastError);
  const autoEndStatus = getAutoEndStatus(state, config, minutesUntilAutoEnd);

  const availableActions = useMemo(() => {
    if (state.status === "idle") return ["start"];
    if (state.status === "running") return canExtend ? ["extend", "end"] : ["end"];
    if (state.status === "failed") return ["retry"];
    return [];
  }, [canExtend, state.status]);

  const fetchState = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/broadcast-server", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load state.");
      setPayload(data);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (canManage) fetchState();
    if (sessionStatus !== "loading" && !canManage) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage, sessionStatus]);

  useEffect(() => {
    if (!canManage || !isTransient) return;
    const id = setInterval(() => fetchState({ silent: true }), 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage, isTransient]);

  useEffect(() => {
    if (!isTransient && !runningAction) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue =
        "Broadcast Control is still processing. Leaving may pause the lifecycle polling.";
      return event.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isTransient, runningAction]);

  const openConfirm = (actionId) => {
    setConfirmAction(actionId);
    setConfirmText("");
    setError("");
    setSuccess("");
  };

  const closeConfirm = () => {
    setConfirmAction(null);
    setConfirmText("");
  };

  const getActionDisabledReason = (actionId) => {
    if (actionId !== "end" || getCanEndBroadcast(state, config)) return "";
    const minRuntime = config.minRuntimeMinutes || 0;
    const runtime = getRuntimeMinutes(state.startedAt);
    return `End Broadcast baru bisa dipakai setelah ${minRuntime} menit. Sekarang baru ${runtime} menit.`;
  };

  const runAction = async () => {
    if (!confirmAction || !selectedAction) return;
    if (confirmText !== selectedAction.confirm) return;

    const actionId = confirmAction;
    setRunningAction(actionId);
    setSuccess(`${selectedAction.label} requested.`);
    closeConfirm();

    try {
      const res = await fetch(selectedAction.endpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Action failed.");
      setPayload(data);
    } catch (err) {
      if (isLikelyNetworkGlitch(err)) {
        setSuccess(
          `${selectedAction.label} mungkin tetap berjalan. Halaman ini akan refresh status otomatis.`,
        );
        setError("");
        fetchState({ silent: true });
        setTimeout(() => fetchState({ silent: true }), 5000);
      } else {
        setSuccess("");
        setError(err.message);
      }
    } finally {
      setRunningAction("");
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

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className={`rounded-lg border p-6 shadow-sm ${statusCopy.tone}`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg ${statusCopy.iconTone}`}
            >
              {isTransient || runningAction ? (
                <FiRefreshCw className="animate-spin" size={22} />
              ) : state.status === "running" ? (
                <FiCheckCircle size={22} />
              ) : state.status === "failed" ? (
                <FiAlertTriangle size={22} />
              ) : (
                <FiServer size={22} />
              )}
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wide opacity-70">
                Server Siaran
              </p>
              <h1 className="mt-1 font-heading text-3xl font-bold text-gray-900">
                {getDisplayStatus(state.status)}
              </h1>
              <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed">
                {statusCopy.description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchState()}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2 font-body font-semibold text-white hover:bg-black"
          >
            <FiRefreshCw className={isTransient ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </section>

      {simpleError && (
        <section className="rounded-lg border border-red-100 bg-red-50 p-4 font-body text-sm text-red-700">
          <div className="flex gap-2">
            <FiAlertTriangle className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold">{simpleError}</p>
              {(error || state.lastError) && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-bold">
                    Technical details
                  </summary>
                  <p className="mt-2 break-words text-xs">
                    {error || state.lastError}
                  </p>
                </details>
              )}
            </div>
          </div>
        </section>
      )}

      {success && (
        <section className="rounded-lg border border-green-100 bg-green-50 p-3 font-body text-sm text-green-700">
          {success}
        </section>
      )}

      {(isTransient || runningAction) && (
        <section className="rounded-lg border border-blue-200 bg-blue-50 p-4 font-body text-sm text-blue-800">
          <p className="font-bold">Tetap di halaman ini sampai proses selesai.</p>
          <p className="mt-1">
            {getProgressLabel(state.status)}. Halaman ini refresh otomatis.
          </p>
        </section>
      )}

      {!config.isConfigured && (
        <section className="rounded-lg border border-yellow-200 bg-yellow-50 p-5 text-yellow-800">
          <h2 className="font-heading text-lg font-bold">
            Konfigurasi server belum lengkap
          </h2>
          <details className="mt-2 font-body text-sm">
            <summary className="cursor-pointer font-bold">Lihat detail</summary>
            <p className="mt-2">
              Missing env: {(config.missing || []).join(", ") || "unknown"}.
            </p>
          </details>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <InfoCard label="Uptime" value={getUptime(state.startedAt)} highlight />
        <InfoCard
          label="Auto End"
          value={state.autoEndAt ? formatDate(state.autoEndAt) : "-"}
          highlight
        />
        <InfoCard label="Active IP" value={state.activeServerIp} highlight />
      </div>

      {autoEndStatus && (
        <section
          className={`rounded-lg border p-4 font-body text-sm shadow-sm ${
            config.watchdogConfigured
              ? "border-green-100 bg-green-50 text-green-800"
              : "border-yellow-200 bg-yellow-50 text-yellow-800"
          }`}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold">{autoEndStatus}</p>
              <p className="mt-1">
                {config.watchdogConfigured
                  ? "Server tetap bisa auto-end walaupun dashboard ditutup."
                  : "Pasang monitor eksternal agar server bisa auto-end saat dashboard ditutup."}
              </p>
            </div>
            <p className="text-xs opacity-80">
              Last monitor check: {formatDate(state.lastWatchdogAt)}
            </p>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
              {isTransient ? <FiRefreshCw className="animate-spin" /> : <FiInfo />}
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-gray-900">
                {getProgressLabel(state.status)}
              </h2>
              <p className="mt-1 font-body text-sm text-gray-600">
                {state.status === "running"
                  ? "Server aktif. Pastikan End Broadcast ditekan setelah siaran selesai."
                  : state.status === "idle"
                    ? "Belum ada server siaran aktif."
                    : "Sistem akan lanjut otomatis selama halaman ini terbuka."}
              </p>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-heading text-xl font-bold text-gray-900">
              Aksi
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-2">
              {availableActions.map((actionId) => {
                const action = ACTIONS[actionId];
                const Icon = action.icon;
                const disabledReason = getActionDisabledReason(actionId);
                return (
                  <div key={actionId}>
                    <button
                      type="button"
                      disabled={
                        !config.isConfigured ||
                        Boolean(runningAction) ||
                        Boolean(disabledReason)
                      }
                      onClick={() => openConfirm(actionId)}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 font-body font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${action.className}`}
                    >
                      <Icon />
                      {runningAction === actionId ? "Sending..." : action.label}
                    </button>
                    {disabledReason && (
                      <p className="mt-2 rounded-md border border-yellow-100 bg-yellow-50 p-2 font-body text-xs text-yellow-700">
                        {disabledReason}
                      </p>
                    )}
                  </div>
                );
              })}
              {availableActions.length === 0 && (
                <div className="rounded-md border border-blue-100 bg-blue-50 p-3 font-body text-sm text-blue-700">
                  Proses sedang berjalan. Tunggu sampai aksi berikutnya muncul.
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      <details className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <summary className="cursor-pointer font-heading text-lg font-bold text-gray-900">
          Advanced Details
        </summary>
        <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
          <InfoCard label="Raw Status" value={state.status} />
          <InfoCard label="Raw Phase" value={state.phase} />
          <InfoCard label="Active Server ID" value={state.activeServerId} />
          <InfoCard label="Server Name" value={state.serverName} />
          <InfoCard label="Latest Snapshot ID" value={state.latestSnapshotId} />
          <InfoCard label="Pending Snapshot ID" value={state.pendingSnapshotId} />
          <InfoCard label="Started At" value={formatDate(state.startedAt)} />
          <InfoCard label="Ended At" value={formatDate(state.endedAt)} />
          <InfoCard label="Auto End Started At" value={formatDate(state.autoEndStartedAt)} />
          <InfoCard label="Last Watchdog At" value={formatDate(state.lastWatchdogAt)} />
          <InfoCard label="Last Watchdog Action" value={state.lastWatchdogAction} />
          <InfoCard label="Server Type" value={config.serverType} />
          <InfoCard label="Location" value={config.location} />
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
            {confirmAction === "extend" && (
              <p className="mt-3 rounded-md border border-blue-100 bg-blue-50 p-3 font-body text-xs text-blue-700">
                This will add {config.extendMinutes || 60} minutes to the
                current auto-end deadline.
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
                disabled={confirmText !== selectedAction.confirm}
                onClick={runAction}
                className={`rounded-md px-4 py-2 font-body font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${selectedAction.className}`}
              >
                {selectedAction.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
