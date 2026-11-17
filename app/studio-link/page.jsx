"use client";

// /studio-link?dev=<deviceId>&name=<deviceName>
// Halaman pairing app 8EH Studio:
//   1. Kru login Google (kalau belum, NextAuth redirect balik sini).
//   2. Server cek role → scope (TECHNIC/DEV = broadcast, MUSIC = metadata,
//      lainnya ditolak).
//   3. Kru klik Setujui → device dapat token; app polling otomatis menerima.

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";

export default function StudioLinkPage() {
  const { data: session, status } = useSession();
  const [params, setParams] = useState({ dev: "", name: "" });
  const [linkInfo, setLinkInfo] = useState(null); // { sid, scope, user }
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(""); // approved | denied | error
  const [error, setError] = useState("");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setParams({
      dev: p.get("dev") || "",
      name: p.get("name") || "Perangkat Studio",
    });
  }, []);

  const role = session?.user?.role || "";

  // buat link request begitu session siap — server yang menentukan scope
  // (role tidak di-gate di client; error 403 server ditampilkan apa adanya)
  useEffect(() => {
    if (status !== "authenticated" || !params.dev) return;
    if (linkInfo) return;
    (async () => {
      try {
        const res = await fetch("/api/studio/link-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId: params.dev,
            deviceName: params.name,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal membuat link");
        setLinkInfo(data);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [status, params, linkInfo]);

  const approve = async (isApprove) => {
    if (!linkInfo) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/studio/link-session", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sid: linkInfo.sid, approve: isApprove }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses");
      setResult(isApprove ? "approved" : "denied");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#14161a] text-gray-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#1c1f26] border border-gray-700/60 rounded-2xl p-8 space-y-5">
        <div>
          <h1 className="text-xl font-bold">8EH Studio — Hubungkan Perangkat</h1>
          <p className="text-sm text-gray-400 mt-1">
            App di perangkat ini minta izin terhubung ke sistem 8EH.
          </p>
        </div>

        <div className="bg-black/30 rounded-lg p-4 text-sm space-y-2">
          <div>
            <span className="text-gray-500">Perangkat: </span>
            <span className="font-medium">{params.name || "—"}</span>
          </div>
          {status === "authenticated" && (
            <div>
              <span className="text-gray-500">Akun: </span>
              <span className="font-medium">{session.user.name || session.user.email}</span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-700">{role || "—"}</span>
            </div>
          )}
          {linkInfo && (
            <div>
              <span className="text-gray-500">Akses: </span>
              <span className="font-medium">
                {linkInfo.scope === "broadcast"
                  ? "Siaran + Metadata"
                  : linkInfo.scope === "metadata"
                    ? "Hanya Metadata"
                    : "—"}
              </span>
            </div>
          )}
        </div>

        {status === "loading" && (
          <p className="text-sm text-gray-500">Memuat…</p>
        )}

        {status === "unauthenticated" && (
          <button
            onClick={() => signIn("google", { callbackUrl: window.location.href })}
            className="w-full py-3 rounded-lg bg-white text-gray-900 font-semibold hover:bg-gray-200"
          >
            Login dengan Google
          </button>
        )}

        {status === "authenticated" && error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {status === "authenticated" && !result && (
          <div className="flex gap-3">
            <button
              disabled={!linkInfo || busy}
              onClick={() => approve(true)}
              className="flex-1 py-3 rounded-lg bg-[#D83232] hover:bg-[#c02a2a] font-semibold disabled:opacity-40"
            >
              {busy ? "Memproses…" : "Setujui"}
            </button>
            <button
              disabled={!linkInfo || busy}
              onClick={() => approve(false)}
              className="flex-1 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 font-semibold disabled:opacity-40"
            >
              Tolak
            </button>
          </div>
        )}

        {result === "approved" && (
          <p className="text-sm text-green-400">
            ✓ Perangkat disetujui. Balik ke app 8EH Studio — login otomatis
            selesai dalam beberapa detik.
          </p>
        )}
        {result === "denied" && (
          <p className="text-sm text-yellow-400">
            Permintaan ditolak. Kamu bisa menutup halaman ini.
          </p>
        )}

        <p className="text-xs text-gray-600">
          Kode perangkat: <span className="font-mono">{params.dev.slice(0, 12)}…</span>
        </p>
      </div>
    </div>
  );
}
