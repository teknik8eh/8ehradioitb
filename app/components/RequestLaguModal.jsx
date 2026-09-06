"use client";
import React, { useState, useEffect, useRef } from "react";
import ButtonPrimary from "@/app/components/ButtonPrimary";

export default function RequestLaguModal({ isOpen, onClose }) {
  const [onAir, setOnAir] = useState(false);
  const [songRequestEnabled, setSongRequestEnabled] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Manual input fallback
  const [showManual, setShowManual] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualArtist, setManualArtist] = useState("");

  const [message, setMessage] = useState("");
  const [remaining, setRemaining] = useState(null);
  const [limit, setLimit] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Guest session state
  const [hasSession, setHasSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [guestNameInput, setGuestNameInput] = useState("");
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionError, setSessionError] = useState("");

  // Cek guest session saat modal dibuka
  useEffect(() => {
    if (!isOpen) return;
    const checkSession = async () => {
      setIsCheckingSession(true);
      try {
        const res = await fetch("/api/live-chat/guest-session");
        const data = await res.json();
        const apiLimit = data.requestLimit || 3;
        setLimit(apiLimit);
        if (data.active) {
          setHasSession(true);
          setRemaining(data.remainingRequests ?? Math.max(0, apiLimit - (data.requestCount || 0)));
        } else {
          setHasSession(false);
          setRemaining(apiLimit);
        }
      } catch {
        setHasSession(false);
      } finally {
        setIsCheckingSession(false);
      }
    };
    checkSession();
  }, [isOpen]);

  const handleCreateSession = async () => {
    if (guestNameInput.trim().length < 2) {
      setSessionError("Nama panggilan minimal 2 karakter.");
      return;
    }
    setIsCreatingSession(true);
    setSessionError("");
    try {
      const res = await fetch("/api/live-chat/guest-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: guestNameInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSessionError(data.error || "Gagal membuat session. Coba lagi.");
        return;
      }
      setHasSession(true);
      const apiLimit = data.requestLimit || limit;
      setLimit(apiLimit);
      setRemaining(data.remainingRequests ?? apiLimit);
      window.dispatchEvent(new CustomEvent("guestSessionChanged", { detail: data }));
    } catch {
      setSessionError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Cek onAir dari stream-config
  useEffect(() => {
    const checkOnAir = async () => {
      try {
        const res = await fetch("/api/stream-config");
        const data = await res.json();
        setOnAir(!!data.onAir);
        setSongRequestEnabled(data?.songRequestEnabled !== false);
      } catch {
        setOnAir(false);
      }
    };
    checkOnAir();

    // Listen event status live dari player/layout.
    const handler = (e) => {
      setOnAir(e.detail.onAir);
      setSongRequestEnabled(e.detail.songRequestEnabled !== false);
    };
    window.addEventListener("onAirChanged", handler);
    return () => window.removeEventListener("onAirChanged", handler);
  }, []);

  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery("");
      setResults([]);
      setSearched(false);
      setSelectedSong(null);
      setShowDropdown(false);
      setShowManual(false);
      setManualTitle("");
      setManualArtist("");
      setMessage("");
      setSubmitError("");
    }
  }, [isOpen]);

  // Escape key closes modal
  useEffect(() => {
    const handleKey = (e) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && showDropdown && results.length > 0) {
        handleSelectSong(results[0]);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, showDropdown, results]);

  // Click outside dropdown closes it
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced search
  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setSelectedSong(null);
    setShowManual(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!val.trim()) {
      setResults([]);
      setSearched(false);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      setSearched(false);
      try {
        const res = await fetch("/api/itunes/search-pub", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: val }),
        });
        const data = await res.json();
        setResults(data.items || []);
        setShowDropdown(true);
      } catch {
        setResults([]);
        setShowDropdown(true);
      } finally {
        setIsSearching(false);
        setSearched(true);
      }
    }, 500);
  };

  const handleSelectSong = (song) => {
    setSelectedSong(song);
    setQuery(song.title);
    setShowDropdown(false);
    setShowManual(false);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError("");

    const payload = showManual
      ? {
          songTitle: manualTitle.trim(),
          songArtist: manualArtist.trim(),
          message: message.trim() || undefined,
        }
      : {
          songTitle: selectedSong.title,
          songArtist: selectedSong.artist,
          songCoverUrl: selectedSong.artworkUrl || undefined,
          itunesTrackId: selectedSong.trackId || undefined,
          message: message.trim() || undefined,
        };

    try {
      const res = await fetch("/api/song-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        setSubmitError(data.error || "Siaran sedang tidak live. Request tidak dapat dikirim.");
        return;
      }
      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        setSubmitError(
          data.message || "Kamu sudah mencapai batas request untuk siaran ini."
        );
        setRemaining(0);
        return;
      }
      if (res.status === 409) {
        const data = await res.json().catch(() => ({}));
        setSubmitError(
          data.message || "Lagu ini sudah pernah direquest di sesi ini."
        );
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubmitError(data.error || data.message || "Gagal mengirim request. Coba lagi.");
        return;
      }

      // Success
      setRemaining((prev) => Math.max(0, prev - 1));

      // Toast
      window.dispatchEvent(new CustomEvent("showToast", {
        detail: { message: "Request kamu sudah masuk!" },
      }));

      onClose();
    } catch {
      setSubmitError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    !isSubmitting &&
    remaining > 0 &&
    (showManual
      ? manualTitle.trim() && manualArtist.trim()
      : !!selectedSong);

  if (!isOpen) return null;

  // Jika tidak sedang live, tampilkan pesan
  if (!onAir || !songRequestEnabled) {
    return (
      <div
        className="font-plus-jakarta-sans fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-auto p-8 text-center animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-gray-400">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            {onAir ? "Request Lagu Nonaktif" : "Siaran Belum Live"}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {onAir
              ? "Request lagu sedang tidak dibuka untuk sesi siaran ini."
              : "Request lagu hanya bisa dilakukan saat siaran sedang berlangsung."}
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors"
          >
            Tutup
          </button>
        </div>
        <style jsx>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fadeIn { animation: fadeIn 0.2s ease; }
          .animate-slideUp { animation: slideUp 0.25s ease; }
        `}</style>
      </div>
    );
  }

  // Loading saat cek session
  if (isCheckingSession) {
    return (
      <div
        className="font-plus-jakarta-sans fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
        onClick={onClose}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-auto p-10 text-center">
          <svg className="w-6 h-6 animate-spin mx-auto text-[#D83232]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
          </svg>
        </div>
        <style jsx>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          .animate-fadeIn { animation: fadeIn 0.2s ease; }
        `}</style>
      </div>
    );
  }

  // Belum ada guest session -> minta nama panggilan dulu
  if (!hasSession) {
    return (
      <div
        className="font-plus-jakarta-sans fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-auto p-8 animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center mb-5">
            <div className="w-14 h-14 rounded-full bg-[#D83232]/10 flex items-center justify-center mx-auto mb-3">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-[#D83232]">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900">Siapa nama kamu?</h2>
            <p className="text-sm text-gray-500 mt-1">
              Masukkan nama panggilan untuk mulai request lagu.
            </p>
          </div>

          <input
            type="text"
            value={guestNameInput}
            onChange={(e) => setGuestNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateSession()}
            placeholder="Nama panggilan kamu..."
            maxLength={30}
            autoFocus
            className="w-full border-2 border-gray-200 focus:border-[#D83232] focus:ring-2 focus:ring-[#D83232]/10 rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
          />

          {sessionError && (
            <p className="text-sm text-[#D83232] mt-2">{sessionError}</p>
          )}

          <ButtonPrimary
            onClick={handleCreateSession}
            disabled={isCreatingSession || guestNameInput.trim().length < 2}
            className="!w-full !mt-4 !py-3 !rounded-xl !font-plus-jakarta-sans text-sm disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {isCreatingSession ? "Memulai..." : "Mulai"}
          </ButtonPrimary>

          <button
            onClick={onClose}
            className="w-full mt-2 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Batal
          </button>
        </div>
        <style jsx>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fadeIn { animation: fadeIn 0.2s ease; }
          .animate-slideUp { animation: slideUp 0.25s ease; }
        `}</style>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="font-plus-jakarta-sans fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative pt-8 pb-4 px-6 text-center">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Tutup modal"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            {/* Music icon */}
            <div className="w-14 h-14 rounded-full bg-[#D83232]/10 flex items-center justify-center mx-auto mb-3">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-[#D83232]">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Request Lagu</h2>
            <p className="text-sm text-gray-500 mt-1">
              Cari dan request lagu favoritmu untuk diputar penyiar.
            </p>
          </div>

          {/* Body */}
          <div className="px-6 pb-6 space-y-4">
            {/* Search */}
            <div className="relative" ref={dropdownRef}>
              <div className={`flex items-center border-2 rounded-xl px-3 py-2 transition-colors ${
                query ? "border-[#D83232] ring-2 ring-[#D83232]/10" : "border-gray-200 focus-within:border-[#D83232] focus-within:ring-2 focus-within:ring-[#D83232]/10"
              }`}>
                {isSearching ? (
                  <svg className="w-4 h-4 text-[#D83232] animate-spin mr-2 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0">
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                  </svg>
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={handleQueryChange}
                  onFocus={() => results.length > 0 && setShowDropdown(true)}
                  placeholder="Cari lagu atau artis..."
                  className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder-gray-400"
                  autoComplete="off"
                />
                {query && (
                  <button
                    onClick={() => {
                      setQuery("");
                      setResults([]);
                      setSearched(false);
                      setShowDropdown(false);
                      setSelectedSong(null);
                      setShowManual(false);
                      inputRef.current?.focus();
                    }}
                    className="text-gray-400 hover:text-gray-600 ml-1"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Dropdown */}
              {showDropdown && query && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-[280px] overflow-y-auto">
                  {results.length > 0 ? (
                    results.map((song) => (
                      <button
                        key={song.trackId}
                        onClick={() => handleSelectSong(song)}
                        className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                      >
                        <img
                          src={song.artworkUrl}
                          alt={song.title}
                          className="w-10 h-10 rounded-md object-cover flex-shrink-0 bg-gray-100"
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{song.title}</p>
                          <p className="text-xs text-gray-500 truncate">{song.artist}</p>
                        </div>
                      </button>
                    ))
                  ) : searched && !isSearching ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-gray-500 mb-3">Lagu tidak ditemukan.</p>
                      <button
                        onClick={() => {
                          setShowManual(true);
                          setShowDropdown(false);
                          const parts = query.split(" ");
                          setManualTitle(query);
                        }}
                        className="text-sm text-[#D83232] hover:text-[#B72929] font-medium underline"
                      >
                        Input manual judul & artis
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Selected song preview */}
            {selectedSong && !showManual && (
              <div className="flex items-center gap-3 p-3 bg-[#D83232]/10 rounded-xl border border-[#D83232]/20">
                {selectedSong.artworkUrl && (
                  <img
                    src={selectedSong.artworkUrl}
                    alt={selectedSong.title}
                    className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{selectedSong.title}</p>
                  <p className="text-xs text-gray-500 truncate">{selectedSong.artist}</p>
                </div>
                <button
                  onClick={() => { setSelectedSong(null); setQuery(""); inputRef.current?.focus(); }}
                  className="text-gray-400 hover:text-[#D83232] flex-shrink-0"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
            )}

            {/* Manual input fallback */}
            {showManual && (
              <div className="space-y-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-2">Input manual lagu</p>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="Judul lagu"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#D83232] focus:ring-1 focus:ring-[#D83232]/10"
                />
                <input
                  type="text"
                  value={manualArtist}
                  onChange={(e) => setManualArtist(e.target.value)}
                  placeholder="Nama artis"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#D83232] focus:ring-1 focus:ring-[#D83232]/10"
                />
                <button
                  onClick={() => { setShowManual(false); setQuery(""); }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  ← Cari ulang
                </button>
              </div>
            )}

            {/* Message textarea */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pesan untuk penyiar{" "}
                <span className="text-gray-400 font-normal">(opsional)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => e.target.value.length <= 200 && setMessage(e.target.value)}
                placeholder="Tulis pesan singkat..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#D83232] focus:ring-2 focus:ring-[#D83232]/10 resize-none transition-colors"
              />
              <p className="text-right text-xs text-gray-400 mt-0.5">{message.length}/200</p>
            </div>

            {/* Remaining requests */}
            <p className="text-sm text-gray-600">
              Sisa request:{" "}
              <span className={`font-bold ${remaining === 0 ? "text-[#D83232]" : "text-gray-900"}`}>
                {remaining}/{limit}
              </span>
            </p>

            {/* Error */}
            {submitError && (
              <div className="text-sm text-[#B72929] bg-[#D83232]/10 border border-[#D83232]/20 rounded-lg px-3 py-2">
                {submitError}
              </div>
            )}

            {/* Submit button */}
            <ButtonPrimary
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="!w-full !py-3 !rounded-xl !font-plus-jakarta-sans text-sm disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                  Mengirim...
                </span>
              ) : "Kirim Request"}
            </ButtonPrimary>

            <p className="text-center text-xs text-gray-400">
              Request berlaku untuk sesi siaran saat ini saja.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease; }
        .animate-slideUp { animation: slideUp 0.25s ease; }
      `}</style>
    </>
  );
}
