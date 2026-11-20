"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import styles from "./page.module.css";

export default function StudioLinkPage() {
  const { data: session, status } = useSession();
  const [params, setParams] = useState({ dev: "", name: "", sid: "" });
  const [paramsReady, setParamsReady] = useState(false);
  const [linkInfo, setLinkInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setParams({
      dev: query.get("dev") || "",
      name: query.get("name") || "Perangkat Studio",
      sid: query.get("sid") || "",
    });
    setParamsReady(true);
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !params.dev || linkInfo) return;
    (async () => {
      try {
        const res = await fetch("/api/studio/link-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId: params.dev,
            deviceName: params.name,
            sid: params.sid,
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
    if (!linkInfo || busy) return;
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

  const role = session?.user?.role || "";
  const scope =
    linkInfo?.scope === "broadcast"
      ? "Siaran + metadata"
      : linkInfo?.scope === "metadata"
        ? "Hanya metadata"
        : "Menunggu verifikasi";

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.brand}>
          <Image
            src="/8eh.png"
            alt="8EH"
            width={43}
            height={43}
            className={styles.logo}
            priority
          />
          <span className={styles.brandName}>Studio</span>
        </header>

        <section className={styles.card} aria-labelledby="studio-link-title">
          <div className={styles.heading}>
            <p className={styles.eyebrow}>Device link</p>
            <h1 id="studio-link-title" className={styles.title}>
              Hubungkan perangkat
            </h1>
            <p className={styles.intro}>
              Periksa akun dan akses di bawah sebelum menghubungkan perangkat ke
              8EH Studio.
            </p>
          </div>

          <dl className={styles.details}>
            <div className={styles.detailRow}>
              <dt>Perangkat</dt>
              <dd title={params.name}>
                {paramsReady ? params.name : "Memuat…"}
              </dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Akun kru</dt>
              <dd>
                {status === "authenticated"
                  ? session?.user?.name || session?.user?.email || "—"
                  : "Belum login"}
              </dd>
            </div>
            {status === "authenticated" && (
              <div className={styles.detailRow}>
                <dt>Role</dt>
                <dd>
                  <span className={styles.role}>{role || "—"}</span>
                </dd>
              </div>
            )}
            {status === "authenticated" && (
              <div className={styles.detailRow}>
                <dt>Akses</dt>
                <dd>{scope}</dd>
              </div>
            )}
          </dl>

          <div className={styles.actionArea} aria-live="polite">
            {status === "loading" && (
              <p className={styles.info}>Memeriksa sesi akun…</p>
            )}

            {paramsReady && !params.dev && (
              <p className={styles.error} role="alert">
                Tautan perangkat tidak lengkap. Buka login lagi dari aplikasi
                8EH Studio.
              </p>
            )}

            {status === "unauthenticated" && params.dev && (
              <>
                <p className={styles.info}>
                  Login dengan akun kru 8EH untuk melanjutkan.
                </p>
                <button
                  type="button"
                  className={`${styles.button} ${styles.primary}`}
                  onClick={() =>
                    signIn("google", { callbackUrl: window.location.href })
                  }
                >
                  Login dengan Google
                </button>
              </>
            )}

            {status === "authenticated" && error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}

            {status === "authenticated" && params.dev && !result && (
              <>
                {!linkInfo && !error && (
                  <p className={styles.info}>
                    Menyiapkan permintaan perangkat…
                  </p>
                )}
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.primary}`}
                    disabled={!linkInfo || busy}
                    onClick={() => approve(true)}
                  >
                    {busy ? "Memproses…" : "Setujui perangkat"}
                  </button>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.secondary}`}
                    disabled={!linkInfo || busy}
                    onClick={() => approve(false)}
                  >
                    Tolak
                  </button>
                </div>
              </>
            )}

            {result === "approved" && (
              <p className={styles.success} role="status">
                Perangkat disetujui. Kembali ke aplikasi 8EH Studio; login akan
                selesai dalam beberapa detik.
              </p>
            )}
            {result === "denied" && (
              <p className={styles.info} role="status">
                Permintaan ditolak. Anda dapat menutup halaman ini.
              </p>
            )}
          </div>

          {params.dev && (
            <p className={styles.deviceCode}>
              Kode perangkat <span>{params.dev.slice(0, 12)}…</span>
            </p>
          )}
        </section>
        <p className={styles.footer}>8EH Studio · Akses perangkat kru</p>
      </div>
    </main>
  );
}
