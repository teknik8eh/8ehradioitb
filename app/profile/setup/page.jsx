"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import Image from "next/image";
import { extractFileKeysFromValue } from "@/lib/profile/database";

function buildInitialBiodata(profile) {
  if (
    !profile?.biodata ||
    typeof profile.biodata !== "object" ||
    Array.isArray(profile.biodata)
  ) {
    return {};
  }
  return profile.biodata;
}

function renderValue(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function humanizeMissingFields(missingKeys, fields) {
  const safeKeys = Array.isArray(missingKeys) ? missingKeys : [];
  const byKey = new Map(
    (Array.isArray(fields) ? fields : []).map((field) => [field.key, field.label || field.key]),
  );

  return safeKeys.map((key) => byKey.get(key) || key);
}

function fileNameFromStorageKey(key) {
  if (typeof key !== "string" || !key.trim()) return "File tersimpan";
  const cleaned = key.split("?")[0];
  const chunks = cleaned.split("/");
  return chunks[chunks.length - 1] || "File tersimpan";
}

function sanitizeInternalReturnTo(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!trimmed.startsWith("/")) return "";
  if (trimmed.startsWith("//")) return "";
  return trimmed;
}

function Shell({ children }) {
  return (
    <div className="min-h-safe-screen bg-[radial-gradient(circle_at_top,#fbf7ed_0%,#f3efe5_55%,#eee8dc_100%)] flex flex-col font-body">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 px-6 py-3">
        <div className="mx-auto max-w-3xl">
          <Image
            src="/8eh-real-long.png"
            alt="8EH Radio ITB"
            width={140}
            height={36}
            className="h-8 w-auto object-contain"
            priority
          />
        </div>
      </header>
      <main className="flex-1 px-4 pt-10 pb-16 sm:px-6">
        <div className="mx-auto max-w-3xl w-full">{children}</div>
      </main>
      <footer className="text-xs text-slate-500 font-body text-center py-4">
        © {new Date().getFullYear()} Technic 8EH Radio ITB. All rights reserved.
      </footer>
    </div>
  );
}

function ProfileSetupSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="h-1.5 bg-[#f97316]" />
        <div className="space-y-3 px-8 py-6">
          <div className="h-8 w-80 rounded bg-slate-200" />
          <div className="h-4 w-2/3 rounded bg-slate-100" />
          <div className="h-4 w-1/2 rounded bg-slate-100" />
        </div>
      </div>

      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
        >
          <div className="space-y-3 px-6 py-5">
            <div className="h-4 w-52 rounded bg-slate-200" />
            <div className="h-11 w-full rounded-lg bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProfileSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [fields, setFields] = useState([]);
  const [profileRecord, setProfileRecord] = useState(null);
  const [biodata, setBiodata] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadingFieldKey, setUploadingFieldKey] = useState("");
  const [downloadingKey, setDownloadingKey] = useState("");
  const [setupMode, setSetupMode] = useState("claim");
  const [claimNim, setClaimNim] = useState("");
  const [claimHint, setClaimHint] = useState("");
  const [claimLast6, setClaimLast6] = useState("");
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [claimInfo, setClaimInfo] = useState("");
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);
  const [cooldownUntil, setCooldownUntil] = useState("");
  const [pendingReviewId, setPendingReviewId] = useState("");
  const returnTo = useMemo(
    () => sanitizeInternalReturnTo(searchParams.get("returnTo")),
    [searchParams],
  );

  useEffect(() => {
    if (status !== "authenticated") return;
    void loadProfile();
  }, [status]);

  const missingRequired = useMemo(() => {
    return fields
      .filter((field) => field.isRequired)
      .filter((field) => {
        const value = biodata[field.key];
        if (value === null || value === undefined) return true;
        if (typeof value === "string") return value.trim().length === 0;
        if (Array.isArray(value)) return value.length === 0;
        return false;
      })
      .map((field) => field.key);
  }, [fields, biodata]);

  async function loadProfile() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/profile/me");
      if (!response.ok) {
        throw new Error("Failed to load profile");
      }

      const payload = await response.json();
      const fieldItems = Array.isArray(payload.fields) ? payload.fields : [];
      setFields(fieldItems);
      setProfileRecord(payload.profile || null);
      setBiodata(buildInitialBiodata(payload.profile));
      if (payload?.profile?.id) {
        setSetupMode("new");
      }
    } catch (loadError) {
      setError(loadError.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile(fieldKey, file) {
    const response = await fetch("/api/profile/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fieldKey,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Failed to prepare upload");
    }

    const { uploadUrl, key } = await response.json();

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload file");
    }

    return key;
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/profile/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          biodata,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (payload?.missingFields) {
          const labels = humanizeMissingFields(payload.missingFields, fields);
          throw new Error(
            `Field wajib belum lengkap: ${labels.join(", ")}`,
          );
        }
        throw new Error(payload?.error || "Failed to save profile");
      }

      setSuccess("Data profil tersimpan.");
      if (missingRequired.length === 0) {
        setTimeout(() => {
          router.push(returnTo || "/dashboard/forms");
        }, 600);
      }
    } catch (saveError) {
      setError(saveError.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleLookupClaim(event) {
    event.preventDefault();
    setClaimLoading(true);
    setClaimError("");
    setClaimInfo("");
    setCooldownUntil("");
    setAttemptsRemaining(null);

    try {
      const response = await fetch("/api/profile/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "lookup",
          nim: claimNim,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "NIM tidak ditemukan.");
      }

      setClaimHint(payload.hint || "");
      if (payload.alreadyLinked) {
        setClaimInfo("Profil ini sudah terhubung ke akun Anda.");
      } else {
        setClaimInfo("Profil ditemukan. Lanjutkan verifikasi 6 digit nomor darurat.");
      }
    } catch (lookupError) {
      setClaimHint("");
      setClaimError(lookupError.message || "Gagal memeriksa NIM.");
    } finally {
      setClaimLoading(false);
    }
  }

  async function handleClaimProfile(event) {
    event.preventDefault();
    setClaimLoading(true);
    setClaimError("");
    setClaimInfo("");

    try {
      const response = await fetch("/api/profile/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "claim",
          nim: claimNim,
          emergencyLast6: claimLast6,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (payload?.attemptsRemaining !== undefined) {
          setAttemptsRemaining(Number(payload.attemptsRemaining));
        }
        if (payload?.cooldownUntil) {
          setCooldownUntil(payload.cooldownUntil);
        }
        throw new Error(
          payload?.message ||
            payload?.error ||
            "Verifikasi gagal. Periksa kembali data Anda.",
        );
      }

      setClaimInfo(payload?.message || "Profil berhasil dihubungkan.");
      setClaimLast6("");
      setClaimHint("");
      setAttemptsRemaining(null);
      setCooldownUntil("");
      await loadProfile();
    } catch (claimSubmitError) {
      setClaimError(claimSubmitError.message || "Gagal menghubungkan profil.");
    } finally {
      setClaimLoading(false);
    }
  }

  async function handleRequestReview() {
    setClaimLoading(true);
    setClaimError("");
    setClaimInfo("");

    try {
      const response = await fetch("/api/profile/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request_review",
          nim: claimNim,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          payload?.error || "Gagal mengirim request review.",
        );
      }
      setPendingReviewId(payload?.requestId || "");
      setClaimInfo(payload?.message || "Request review berhasil dikirim.");
    } catch (requestError) {
      setClaimError(requestError.message || "Gagal mengirim request review.");
    } finally {
      setClaimLoading(false);
    }
  }

  const hasExistingProfile = Boolean(profileRecord?.id);

  async function handleDownloadFile(fileKey) {
    if (!fileKey) return;
    setDownloadingKey(fileKey);
    setError("");

    try {
      const response = await fetch("/api/files/download-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key: fileKey }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Gagal membuat download link");
      }

      const payload = await response.json();
      if (!payload.downloadUrl) {
        throw new Error("Download URL tidak tersedia");
      }

      window.open(payload.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (downloadError) {
      setError(downloadError.message || "Gagal mengunduh file");
    } finally {
      setDownloadingKey("");
    }
  }

  if (status === "loading" || loading) {
    return (
      <Shell>
        <ProfileSetupSkeleton />
      </Shell>
    );
  }

  if (status !== "authenticated") {
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="h-1.5 bg-[#f97316]" />
          <div className="p-8 space-y-4">
            <h1 className="font-heading text-2xl font-bold text-slate-900">
              Login Diperlukan
            </h1>
            <p className="font-body text-slate-600">
              Anda harus login untuk melengkapi pendataan kru.
            </p>
            <button
              onClick={() =>
                signIn("google", {
                  callbackUrl: returnTo
                    ? `/profile/setup?returnTo=${encodeURIComponent(returnTo)}`
                    : "/profile/setup",
                })
              }
              className="px-5 py-2 rounded-lg bg-[#f97316] hover:bg-[#ea6c0a] text-white font-body font-semibold transition-colors"
            >
              Login dengan Google
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="h-1.5 bg-[#f97316]" />
          <div className="px-8 py-6">
            <h1 className="font-heading text-2xl font-bold text-slate-900">
              Pendataan Kru (Master Profile)
            </h1>
            <p className="font-body text-slate-600 mt-2">
              Isi data ini sekali untuk mengurangi pertanyaan berulang saat
              mengisi form internal.
            </p>
            <p className="font-body text-sm text-slate-500 mt-1">
              Login sebagai:{" "}
              <span className="font-semibold">{session.user.email}</span>
            </p>
          </div>
        </div>

        {!hasExistingProfile ? (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-5 space-y-4">
              <h2 className="font-heading text-xl font-bold text-slate-900">
                Pilih Metode Pendataan
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSetupMode("claim")}
                  className={`rounded-lg border px-4 py-3 text-left font-body text-sm transition ${
                    setupMode === "claim"
                      ? "border-[#f97316] bg-orange-50 text-slate-900"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <p className="font-semibold">Klaim Profil Existing</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Verifikasi cepat dengan NIM dan 6 digit no darurat.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setSetupMode("new")}
                  className={`rounded-lg border px-4 py-3 text-left font-body text-sm transition ${
                    setupMode === "new"
                      ? "border-[#f97316] bg-orange-50 text-slate-900"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <p className="font-semibold">Isi Profil Baru</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Gunakan opsi ini jika data Anda belum ada di master profile.
                  </p>
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {!hasExistingProfile && setupMode === "claim" ? (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-5 space-y-4">
              <h2 className="font-heading text-xl font-bold text-slate-900">
                Klaim dan Hubungkan Profil
              </h2>
              <p className="font-body text-sm text-slate-600">
                Masukkan NIM Anda terlebih dahulu. Jika ditemukan, kami tampilkan
                hint nomor darurat untuk verifikasi.
              </p>

              <form onSubmit={handleLookupClaim} className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  type="text"
                  value={claimNim}
                  onChange={(event) => setClaimNim(event.target.value)}
                  placeholder="NIM"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20"
                  required
                />
                <button
                  type="submit"
                  disabled={claimLoading}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {claimLoading ? "Memeriksa..." : "Cek NIM"}
                </button>
              </form>

              {claimHint ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="font-body text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Hint Nomor Darurat
                  </p>
                  <p className="mt-1 font-body text-sm font-semibold text-slate-900">
                    {claimHint}
                  </p>
                  <p className="mt-1 font-body text-xs text-slate-500">
                    Masukkan 6 digit terakhir nomor darurat yang sesuai.
                  </p>
                </div>
              ) : null}

              {claimHint ? (
                <form onSubmit={handleClaimProfile} className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <input
                    type="password"
                    value={claimLast6}
                    onChange={(event) =>
                      setClaimLast6(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="6 digit terakhir no darurat"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={6}
                    required
                  />
                  <button
                    type="submit"
                    disabled={claimLoading}
                    className="rounded-lg bg-[#f97316] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#ea6c0a] disabled:opacity-60"
                  >
                    {claimLoading ? "Memverifikasi..." : "Hubungkan Profil"}
                  </button>
                </form>
              ) : null}

              {attemptsRemaining !== null ? (
                <p className="font-body text-xs text-amber-700">
                  Sisa percobaan verifikasi: {attemptsRemaining}
                </p>
              ) : null}

              {cooldownUntil ? (
                <p className="font-body text-xs text-amber-700">
                  Akun dikunci sementara hingga{" "}
                  {new Date(cooldownUntil).toLocaleString("id-ID")}.
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleRequestReview()}
                  disabled={claimLoading || !claimNim.trim()}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Request Review ke DATA/DEVELOPER
                </button>
                {pendingReviewId ? (
                  <span className="font-body text-xs text-slate-500">
                    Request ID: {pendingReviewId}
                  </span>
                ) : null}
              </div>

              {claimError ? (
                <p className="font-body text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {claimError}
                </p>
              ) : null}
              {claimInfo ? (
                <p className="font-body text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  {claimInfo}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {(hasExistingProfile || setupMode === "new") ? (
          <form onSubmit={handleSave} className="space-y-3">
          {fields.map((field) => {
            const value = biodata[field.key];
            const fileKeys =
              field.fieldType === "file"
                ? Array.from(new Set(extractFileKeysFromValue(value)))
                : [];

            if (field.fieldType === "textarea") {
              return (
                <div
                  key={field.id}
                  className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
                >
                  <div className="px-6 py-5">
                    <label className="block font-body text-sm text-slate-700">
                      <span className="font-semibold text-slate-900">
                        {field.label}
                      </span>
                      {field.isRequired ? (
                        <span className="text-red-500"> *</span>
                      ) : null}
                      <textarea
                        className="mt-2 w-full min-h-24 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#f97316]/40 focus:border-[#f97316] transition"
                        value={renderValue(value)}
                        onChange={(event) =>
                          setBiodata((prev) => ({
                            ...prev,
                            [field.key]: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                </div>
              );
            }

            if (field.fieldType === "select") {
              const options = Array.isArray(field.options) ? field.options : [];
              return (
                <div
                  key={field.id}
                  className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
                >
                  <div className="px-6 py-5">
                    <label className="block font-body text-sm text-slate-700">
                      <span className="font-semibold text-slate-900">
                        {field.label}
                      </span>
                      {field.isRequired ? (
                        <span className="text-red-500"> *</span>
                      ) : null}
                      <select
                        className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#f97316]/40 focus:border-[#f97316] transition"
                        value={renderValue(value)}
                        onChange={(event) =>
                          setBiodata((prev) => ({
                            ...prev,
                            [field.key]: event.target.value,
                          }))
                        }
                      >
                        <option value="">Pilih opsi</option>
                        {options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              );
            }

            if (field.fieldType === "file") {
              const inputId = `profile-file-${field.id}`;
              const selectedFileName =
                fileKeys.length > 0
                  ? fileNameFromStorageKey(fileKeys[0])
                  : "Belum ada file yang dipilih";
              const isUploading = uploadingFieldKey === field.key;
              return (
                <div
                  key={field.id}
                  className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
                >
                  <div className="px-6 py-5 space-y-2">
                    <label className="block font-body text-sm text-slate-700">
                      <span className="font-semibold text-slate-900">
                        {field.label}
                      </span>
                      {field.isRequired ? (
                        <span className="text-red-500"> *</span>
                      ) : null}
                    </label>
                    <input
                      id={inputId}
                      type="file"
                      className="sr-only"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        setError("");
                        setUploadingFieldKey(field.key);
                        try {
                          const key = await uploadFile(field.key, file);
                          setBiodata((prev) => ({ ...prev, [field.key]: key }));
                        } catch (uploadError) {
                          setError(
                            uploadError.message || "Failed to upload file",
                          );
                        } finally {
                          setUploadingFieldKey("");
                          event.target.value = "";
                        }
                      }}
                    />
                    <div className="rounded-lg border border-slate-300 bg-slate-50 p-3">
                      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                        <label
                          htmlFor={inputId}
                          className={`inline-flex cursor-pointer items-center rounded-md px-3 py-1.5 text-xs font-semibold text-white transition ${
                            isUploading
                              ? "bg-slate-400"
                              : "bg-[#f97316] hover:bg-[#ea6c0a]"
                          }`}
                        >
                          {isUploading ? "Mengunggah..." : fileKeys.length > 0 ? "Ganti File" : "Pilih File"}
                        </label>
                        {fileKeys.length > 0 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setBiodata((prev) => ({ ...prev, [field.key]: "" }))
                            }
                            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            Hapus File
                          </button>
                        ) : null}
                        <p className="min-w-0 flex-1 font-body text-xs text-slate-600 sm:text-sm">
                          <span className="block truncate">{selectedFileName}</span>
                        </p>
                      </div>
                    </div>
                    {fileKeys.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {fileKeys.map((fileKey, index) => (
                          <button
                            key={`${fileKey}-${index}`}
                            type="button"
                            onClick={() => void handleDownloadFile(fileKey)}
                            disabled={downloadingKey === fileKey}
                            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                          >
                            {downloadingKey === fileKey
                              ? "Mempersiapkan..."
                              : `Download file ${index + 1}`}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            }

            const typeByField = {
              number: "number",
              date: "date",
              email: "email",
              phone: "tel",
              url: "url",
            };

            return (
              <div
                key={field.id}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
              >
                <div className="px-6 py-5">
                  <label className="block font-body text-sm text-slate-700">
                    <span className="font-semibold text-slate-900">
                      {field.label}
                    </span>
                    {field.isRequired ? (
                      <span className="text-red-500"> *</span>
                    ) : null}
                    <input
                      type={typeByField[field.fieldType] || "text"}
                      value={renderValue(value)}
                      onChange={(event) =>
                        setBiodata((prev) => ({
                          ...prev,
                          [field.key]: event.target.value,
                        }))
                      }
                      className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#f97316]/40 focus:border-[#f97316] transition"
                    />
                  </label>
                </div>
              </div>
            );
          })}

          {error ? (
            <p className="font-body text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="font-body text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              {success}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#f97316] hover:bg-[#ea6c0a] text-white font-body font-semibold transition-colors disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan Pendataan"}
          </button>
          </form>
        ) : null}
      </div>
    </Shell>
  );
}
