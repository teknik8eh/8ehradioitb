"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
/**
 * GlobalAudioPlayer
 * ------------------
 * A fixed player bar that stays at the top of the page while audio is playing.
 * It closely replicates the design shown in the provided screenshot:
 *   ┌────────────────────────────────────────────────────────────────┐
 *   │ ▢  Episode 1 …   ────────────────⏮ ⏯ ⏭──────  🔊 ───────      │
 *   └────────────────────────────────────────────────────────────────┘
 *
 * Behaviour:
 * 1. The bar is only visible while the stream is playing / loading / buffering.
 * 2. Uses the existing `useRadioStream` hook for fetching + retry logic.
 * 3. Dispatches a `window` custom-event  `audioStateChanged` so other
 *    components (e.g. the Navbar mobile play button) stay in sync.
 */

const RequestLaguModal = dynamic(() => import("@/app/components/RequestLaguModal"), { ssr: false });

const GlobalAudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showPlayer, setShowPlayer] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const [playerConfig, setPlayerConfig] = useState({
    title: "",
    subtitle: "",
    coverImage: "",
  });

  useEffect(() => {
    fetch("/api/player-config")
      .then((res) => res.json())
      .then((data) => {
        setPlayerConfig({
          title: data?.title || "",
          subtitle: data?.subtitle || "",
          coverImage: data?.coverImage || "",
        });
      })
      .catch(() => {
        setPlayerConfig({ title: "", subtitle: "", coverImage: "" });
      });
  }, []);

  useEffect(() => {
    let externalPause = false;
    const handler = (e) => {
      const playing = e.detail.isPlaying;
      setIsPlaying(playing);
      if (playing) setShowPlayer(true);
    };
    window.addEventListener("audioStateChanged", handler);

    const handlePodcastPlay = () => {
      setIsPlaying(false);
      setShowPlayer(false);
      externalPause = true;
      window.dispatchEvent(new CustomEvent("pauseRequested"));
    };
    window.addEventListener("podcastPlayRequested", handlePodcastPlay);

    if (!isPlaying && externalPause) {
      setShowPlayer(false);
      externalPause = false;
    }

    return () => {
      window.removeEventListener("audioStateChanged", handler);
      window.removeEventListener("podcastPlayRequested", handlePodcastPlay);
    };
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      window.dispatchEvent(new CustomEvent("radioPlayRequested"));
    }
  }, [isPlaying]);

  // Listen for chat open event from TopLiveBar
  useEffect(() => {
    const handleOpenChat = () => {
      window.dispatchEvent(new CustomEvent("openLiveChat"));
    };
    window.addEventListener("openLiveChatFromBar", handleOpenChat);
    return () => window.removeEventListener("openLiveChatFromBar", handleOpenChat);
  }, []);

  useEffect(() => {
  const handler = () => setIsRequestModalOpen(true);
  window.addEventListener("openRequestLagu", handler);
  return () => window.removeEventListener("openRequestLagu", handler);
}, []);

  const togglePlay = () => {
    if (isPlaying) {
      window.dispatchEvent(new CustomEvent("pauseRequested"));
    } else {
      window.dispatchEvent(new CustomEvent("playRequested"));
    }
  };

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setIsMuted(newVol === 0);
    window.dispatchEvent(new CustomEvent("volumeChanged", { detail: { volume: newVol } }));
  };

  const handleMuteToggle = () => {
    if (isMuted) {
      setIsMuted(false);
      setVolume(1);
      window.dispatchEvent(new CustomEvent("volumeChanged", { detail: { volume: 1 } }));
    } else {
      setIsMuted(true);
      setVolume(0);
      window.dispatchEvent(new CustomEvent("volumeChanged", { detail: { volume: 0 } }));
    }
  };

  if (!showPlayer) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_24px_rgba(0,0,0,0.07)]">
        <div className="h-[72px] md:h-[76px] max-w-full px-4 md:px-8 flex items-center justify-between gap-4">

          {/* ── LEFT: Art + Info ── */}
          <div className="flex items-center gap-3 w-[200px] md:w-[240px] flex-shrink-0">
            <div className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 shadow-sm">
              <img
                src={playerConfig.coverImage || "/8eh.png"}
                alt="cover"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate leading-tight">
                {playerConfig.title || "8EH Radio ITB"}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                </span>
                <span className="text-xs text-gray-500 font-medium">Live Now</span>
              </div>
            </div>
          </div>

          {/* ── CENTER: Playback controls ── */}
          <div className="flex items-center gap-4 justify-center flex-1">
            {/* Previous (disabled for live) */}
            <button
              disabled
              className="text-gray-300 cursor-not-allowed hidden md:block"
              aria-label="Previous"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full border border-gray-300 hover:border-gray-600 text-gray-800 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Next (disabled for live) */}
            <button
              disabled
              className="text-gray-300 cursor-not-allowed hidden md:block"
              aria-label="Next"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>
          </div>

          {/* ── RIGHT: Icons + Volume ── */}
          <div className="flex items-center gap-3 md:gap-4 w-[200px] md:w-[240px] justify-end flex-shrink-0">
            {/* Queue */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("openQueue"))}
              className="text-gray-400 hover:text-gray-700 transition-colors hidden md:block"
              aria-label="Antrian"
              title="Antrian"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <line x1="8" y1="6" x2="21" y2="6"/>
                <line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/>
                <line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </button>

            {/* Chat */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("openLiveChat"))}
              className="text-gray-400 hover:text-gray-700 transition-colors hidden md:block"
              aria-label="Live Chat"
              title="Live Chat"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>

            {/* Request Lagu */}
            <button
              onClick={() => setIsRequestModalOpen(true)}
              className="text-gray-400 hover:text-red-500 transition-colors"
              aria-label="Request Lagu"
              title="Request Lagu"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </button>

            {/* Volume mute toggle */}
            <button
              onClick={handleMuteToggle}
              className="text-gray-400 hover:text-gray-700 transition-colors hidden md:block"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-400">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
              )}
            </button>

            {/* Volume slider */}
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-800 hidden md:block"
              aria-label="Volume"
            />
          </div>
        </div>
      </div>

      {/* Request Lagu Modal */}
      <RequestLaguModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
      />
    </>
  );
};

export default GlobalAudioPlayer;
