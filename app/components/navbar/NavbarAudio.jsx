"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRadioStream } from "@/app/hooks/useRadioStream";
import { useGlobalAudio } from "@/app/hooks/useGlobalAudio";

export default function NavbarAudio({ onAir, variant }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [localLoading, setLocalLoading] = useState(false); // For mobile sync
  const audioRef = useGlobalAudio();
  const reconnectTimerRef = useRef(null);
  const isPlayingRef = useRef(false);

  /* ------------------------------------------------------------- */
  /* Radio stream logic                                            */
  /* ------------------------------------------------------------- */
  const {
    streamUrl,
    isLoading: streamLoading,
    handleStreamError,
    getStreamUrl,
    setIsLoading: setStreamLoading,
  } = useRadioStream();

  // Combine loading states (stream loading or waiting for event sync)
  const isLoading = streamLoading || localLoading;

  /* ------------------------------------------------------------- */
  /* Helper to emit play state to other components                 */
  /* ------------------------------------------------------------- */
  const emitAudioStateChanged = useCallback((playing) => {
    window.dispatchEvent(
      new CustomEvent("audioStateChanged", {
        detail: { isPlaying: playing },
      }),
    );
  }, []);

  /* ------------------------------------------------------------- */
  /* Core playback actions (Host/Desktop only)                     */
  /* ------------------------------------------------------------- */
  const playStream = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      const freshUrl = getStreamUrl();
      // Hanya set src jika berbeda
      if (audio.src !== freshUrl) {
        audio.src = freshUrl;
        audio.load();
      }
      setStreamLoading(true);
      await audio.play();
      audio.volume = volume;
      setIsPlaying(true);
      setStreamLoading(false);
      emitAudioStateChanged(true);
    } catch (err) {
      console.error("Navbar play error", err);
      setIsPlaying(false);
      setStreamLoading(false);
      handleStreamError();
    }
  }, [
    getStreamUrl,
    volume,
    emitAudioStateChanged,
    handleStreamError,
    setStreamLoading,
  ]);

  const pauseStream = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    // Reset source to fully stop streaming and avoid overlapping audio
    audio.removeAttribute("src");
    audio.load();
    setIsPlaying(false);
    emitAudioStateChanged(false);
  }, [emitAudioStateChanged]);

  const togglePlay = useCallback(() => {
    if (variant === "desktop") {
      // Host logic
      if (isPlaying) {
        pauseStream();
      } else {
        playStream();
      }
    } else {
      // Remote logic (Mobile)
      setLocalLoading(true);
      // Timeout to clear local loading if no response
      setTimeout(() => setLocalLoading(false), 5000);

      if (isPlaying) {
        window.dispatchEvent(new CustomEvent("pauseRequested"));
      } else {
        window.dispatchEvent(new CustomEvent("playRequested"));
      }
    }
  }, [isPlaying, playStream, pauseStream, variant]);

  /* ------------------------------------------------------------- */
  /* External events                                               */
  /* ------------------------------------------------------------- */
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const playing = !audio.paused && !audio.ended && !!audio.src;
    setIsPlaying(playing);
    isPlayingRef.current = playing;
    if (playing) emitAudioStateChanged(true);
    audio.volume = volume;
  }, [audioRef, emitAudioStateChanged, volume]);

  useEffect(() => {
    const handlePlayReq = () => {
      // Only host (desktop) acts on requests
      if (variant === "desktop" && !isPlaying) playStream();
    };

    const handlePauseReq = () => {
      // Only host (desktop) acts on requests
      if (variant === "desktop" && isPlaying) pauseStream();
    };

    const handleAudioStateChanged = (e) => {
      // Both variants sync their state
      setIsPlaying(e.detail.isPlaying);
      setLocalLoading(false); // Clear local loading when we get confirmation
    };

    const handleVolumeChanged = (e) => {
      const newVol = e.detail.volume;
      setVolume(newVol);
      if (audioRef.current) audioRef.current.volume = newVol;
    };

    window.addEventListener("playRequested", handlePlayReq);
    window.addEventListener("pauseRequested", handlePauseReq);
    window.addEventListener("audioStateChanged", handleAudioStateChanged);
    window.addEventListener("volumeChanged", handleVolumeChanged);

    return () => {
      window.removeEventListener("playRequested", handlePlayReq);
      window.removeEventListener("pauseRequested", handlePauseReq);
      window.removeEventListener("audioStateChanged", handleAudioStateChanged);
      window.removeEventListener("volumeChanged", handleVolumeChanged);
    };
  }, [isPlaying, playStream, pauseStream, variant]);

  useEffect(() => {
  // The singleton audio instance is shared across page navigations.
  if (variant !== "desktop") return;
  const audio = audioRef.current;
  if (!audio) return;

  const scheduleReconnect = () => {
    if (!isPlayingRef.current) return;
    if (reconnectTimerRef.current) return;

    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      if (isPlayingRef.current) {
        console.log("[Radio] Auto-reconnecting...");
        playStream();
      }
    }, 2000);
  };

  const handleStalled = () => {
    console.log("[Radio] Stream stalled");
    scheduleReconnect();
  };

  const handleError = () => {
    console.log("[Radio] Stream error");
    setIsPlaying(false);
    emitAudioStateChanged(false);
    scheduleReconnect();
  };

  const handleEnded = () => {
    console.log("[Radio] Stream ended unexpectedly");
    scheduleReconnect();
  };

  audio.addEventListener("stalled", handleStalled);
  audio.addEventListener("error", handleError);
  audio.addEventListener("ended", handleEnded);

  return () => {
    audio.removeEventListener("stalled", handleStalled);
    audio.removeEventListener("error", handleError);
    audio.removeEventListener("ended", handleEnded);
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };
}, [variant, playStream, emitAudioStateChanged]);


  /* ------------------------------------------------------------- */
  /* Render Logic                                                  */
  /* ------------------------------------------------------------- */

  if (variant === "mobile") {
    return (
      <button
        onClick={togglePlay}
        className={`md:hidden px-3 py-2 rounded-full font-body font-medium transition-colors cursor-pointer flex items-center gap-2 ${
          onAir
            ? "bg-[#D83232] hover:bg-[#B72929] text-white cursor-pointer"
            : "bg-gray-300 text-white cursor-not-allowed"
        }`}
        disabled={!onAir || isLoading}
        aria-live="polite"
        style={{
          boxShadow: `
            0 1px 2px rgba(2, 8, 11, 0.05),
            inset 0 32px 24px rgba(255, 255, 255, 0.05),
            inset 0 2px 1px rgba(255, 255, 255, 0.25),
            inset 0 0px 0px rgba(2, 8, 11, 0.15),
            inset 0 -2px 1px rgba(0, 0, 0, 0.20)
          `,
        }}
      >
        {isLoading ? (
          <svg
            className="h-5 w-5 text-white spinner"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="3"
            />
            <path
              d="M22 12a10 10 0 00-10-10"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        ) : isPlaying ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <rect x="6" y="5" width="4" height="14" rx="1" fill="white" />
            <rect x="14" y="5" width="4" height="14" rx="1" fill="white" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-white"
            fill="white"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <polygon points="6,4 20,12 6,20" fill="white" />
          </svg>
        )}
      </button>
    );
  }

  // Desktop variant
  return (
    <>
      <button
        onClick={togglePlay}
        className={`hidden md:flex px-4 py-2 rounded-full font-body font-medium transition-colors items-center gap-2 ${
          onAir
            ? "bg-[#D83232] hover:bg-[#B72929] text-white cursor-pointer"
            : "bg-gray-300 text-white cursor-not-allowed"
        } ${isLoading ? "animate-btn-bounce-loading" : ""}`}
        disabled={!onAir || isLoading}
        aria-live="polite"
        style={{
          boxShadow: `
            0 1px 2px rgba(2, 8, 11, 0.05),
            inset 0 32px 24px rgba(255, 255, 255, 0.05),
            inset 0 2px 1px rgba(255, 255, 255, 0.25),
            inset 0 0px 0px rgba(2, 8, 11, 0.15),
            inset 0 -2px 1px rgba(0, 0, 0, 0.20)
          `,
        }}
      >
        {isLoading ? (
          <>
            <svg
              className="h-5 w-5 text-white spinner"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="3"
              />
              <path
                d="M22 12a10 10 0 00-10-10"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <span className="ml-1">Loading...</span>
          </>
        ) : isPlaying ? (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <rect x="6" y="5" width="4" height="14" rx="1" fill="white" />
              <rect x="14" y="5" width="4" height="14" rx="1" fill="white" />
            </svg>
            <span className="ml-1">Pause</span>
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-white"
              fill="white"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <polygon points="6,4 20,12 6,20" fill="white" />
            </svg>
            <span className="ml-1">Play</span>
          </>
        )}
      </button>
    </>
  );
}
