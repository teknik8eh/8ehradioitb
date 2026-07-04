"use client";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";

const RequestLaguModal = dynamic(() => import("@/app/components/RequestLaguModal"), { ssr: false });

export default function QueuePanel({ isOpen, onClose }) {
  const [nowPlaying, setNowPlaying] = useState(null);
  const [queued, setQueued] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [remaining, setRemaining] = useState(3);
  const [limit, setLimit] = useState(3);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const intervalRef = useRef(null);
  const rejectedNotifiedRef = useRef(new Set()); // track yang sudah dinotif

  const showToast = (message, type = "success", duration = 4000) => {
    window.dispatchEvent(new CustomEvent("showToast", { detail: { message, type, duration } }));
  };

  const fetchQueue = async () => {
    try {
      const res = await fetch("/api/song-request/queue");
      const data = await res.json();
      setNowPlaying(data.nowPlaying || null);
      setQueued(data.queued || []);
    } catch {
      // silently fail
    }
  };

  const fetchRemaining = async () => {
    try {
      const res = await fetch("/api/guest-session");
      const data = await res.json();
      const apiLimit = data.limit || 3;
      setLimit(apiLimit);
      if (data.session) {
        const used = data.session.requestCount || 0;
        setRemaining(Math.max(0, apiLimit - used));
      } else {
        setRemaining(apiLimit);
      }
    } catch {}
  };

  // Poll status request milik user untuk deteksi penolakan
  const checkRejected = async () => {
    try {
      const res = await fetch("/api/song-request/my-requests");
      if (!res.ok) return;
      const data = await res.json();
      (data.requests || []).forEach((req) => {
        if (
          req.status === "REJECTED" &&
          !rejectedNotifiedRef.current.has(req.id)
        ) {
          rejectedNotifiedRef.current.add(req.id);
          const reason = req.rejectedReason
            ? ` Alasan: "${req.rejectedReason}"`
            : "";
          showToast(
            `❌ Request "${req.songTitle}" ditolak.${reason}`,
            "error",
            8000 // tampil lebih lama
          );
        }
      });
    } catch {}
  };

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      Promise.all([fetchQueue(), fetchRemaining()]).finally(() =>
        setIsLoading(false)
      );
      intervalRef.current = setInterval(() => {
        fetchQueue();
        checkRejected();
      }, 5000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isOpen]);

  // Juga cek saat panel tertutup (background polling)
  useEffect(() => {
    const bgInterval = setInterval(checkRejected, 10000);
    return () => clearInterval(bgInterval);
  }, []);

  const handleRequestModalClose = () => {
    setIsRequestModalOpen(false);
    fetchRemaining();
    fetchQueue();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[150] bg-black/20"
          onClick={handleBackdropClick}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-12 right-0 bottom-0 z-[160] w-full max-w-sm bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="bg-[#e74c3c] px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-white">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
            <span className="font-bold text-sm">Antrian Lagu</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRequestModalOpen(true)}
              className="flex items-center gap-1 bg-white/20 hover:bg-white/30 transition-colors text-white text-xs font-medium px-3 py-1.5 rounded-full"
            >
              + Request
            </button>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-1"
              aria-label="Tutup panel"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-gray-200 border-t-red-400 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* NOW PLAYING */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <span className="text-xs font-bold text-gray-500 tracking-wider uppercase">
                    Now Playing
                  </span>
                </div>

                {nowPlaying ? (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                    <div className="flex gap-3">
                      {nowPlaying.songCoverUrl ? (
                        <img
                          src={nowPlaying.songCoverUrl}
                          alt={nowPlaying.songTitle}
                          className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-red-300">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                          </svg>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900 text-sm truncate">
                          {nowPlaying.songTitle}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{nowPlaying.songArtist}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Request oleh{" "}
                          <span className="text-red-500 font-medium">{nowPlaying.guestName}</span>
                        </p>
                        {nowPlaying.message && (
                          <p className="text-xs text-gray-400 italic mt-0.5">
                            "{nowPlaying.message}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-gray-400 bg-gray-50 rounded-xl">
                    Belum ada lagu yang sedang diputar.
                  </div>
                )}
              </div>

              {/* SELANJUTNYA */}
              <div>
                <p className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-2">
                  Selanjutnya ({queued.length})
                </p>

                {queued.length > 0 ? (
                  <div className="space-y-2">
                    {queued.map((song, index) => (
                      <div
                        key={song.id}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-xs font-bold text-gray-300 w-4 text-center flex-shrink-0">
                          {index + 1}
                        </span>
                        {song.songCoverUrl ? (
                          <img
                            src={song.songCoverUrl}
                            alt={song.songTitle}
                            className="w-9 h-9 rounded-md object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gray-300">
                              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                            </svg>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800 truncate">{song.songTitle}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {song.songArtist} · {song.guestName}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-gray-400 bg-gray-50 rounded-xl">
                    Belum ada lagu dalam antrean.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 py-3 flex-shrink-0">
          <p className="text-xs text-gray-400 text-center">
            Sisa request kamu:{" "}
            <span className="font-bold text-gray-600">{remaining}/{limit}</span>
          </p>
        </div>
      </div>

      {/* Request Modal */}
      <RequestLaguModal
        isOpen={isRequestModalOpen}
        onClose={handleRequestModalClose}
      />
    </>
  );
}
