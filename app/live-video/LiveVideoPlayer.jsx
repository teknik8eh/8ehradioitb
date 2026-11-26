"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaPlay } from "react-icons/fa";
import { FiLoader, FiMaximize, FiMinimize, FiPause, FiRadio, FiVolume2, FiVolumeX } from "react-icons/fi";

const statuses = {
  checking: "Memeriksa siaran video…",
  available: "Tekan Play untuk menonton.",
  offline: "Siaran video sedang offline.",
  unreachable: "Koneksi video belum stabil. Mencoba lagi…",
  unavailable: "Siaran video belum tersedia.",
};

const controlStyle = "grid size-10 shrink-0 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:size-11";

export default function LiveVideoPlayer({ url, fallbackUrl }) {
  const stageRef = useRef(null);
  const videoRef = useRef(null);
  const wantsPlayback = useRef(false);
  const retriedPlayback = useRef(false);
  const [status, setStatus] = useState(url ? "checking" : "unavailable");
  const [showVideo, setShowVideo] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [playerError, setPlayerError] = useState("");
  const [feedRetry, setFeedRetry] = useState(0);
  const [usingFallback, setUsingFallback] = useState(false);
  const sourceUrl = usingFallback ? fallbackUrl : url;
  const lowLatency = Boolean(fallbackUrl) && !usingFallback;

  const playIfRequested = useCallback((video) => {
    const hasSource = video.currentSrc || video.getAttribute("src") || video.srcObject;
    if (!wantsPlayback.current || !video.paused || !hasSource) return;
    video.play().catch((error) => {
      if (error.name === "NotAllowedError") {
        wantsPlayback.current = false;
        setBuffering(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!sourceUrl) return;
    let stopped = false;
    let ready = false;
    let controller;
    let timer;
    let failures = 0;
    let missing = 0;

    function markFailure(isOffline) {
      if (stopped) return;
      failures += 1;
      missing = isOffline ? missing + 1 : 0;
      if (lowLatency && failures >= 2) {
        ready = true;
        setUsingFallback(true);
        setStatus("checking");
        return;
      }
      setStatus((previous) => {
        if (missing >= 2) return "offline";
        if (previous === "available" && failures < 3) return previous;
        if (isOffline && previous === "checking") return previous;
        return "unreachable";
      });
    }

    async function checkFeed() {
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(sourceUrl, { cache: "no-store", signal: controller.signal });
        if (response.status === 404) {
          markFailure(true);
          return;
        }
        if (!response.ok) throw new Error("Playlist unavailable");
        const playlist = await response.text();
        if (!playlist.startsWith("#EXTM3U")) {
          throw new Error("Live playlist unavailable");
        }
        if (playlist.includes("#EXT-X-ENDLIST")) {
          markFailure(true);
          return;
        }
        if (!stopped) {
          ready = true;
          setShowVideo(true);
          setStatus("available");
        }
      } catch {
        markFailure(false);
      } finally {
        clearTimeout(timeout);
        if (!stopped && !ready) timer = setTimeout(checkFeed, 3000);
      }
    }
    checkFeed();
    return () => {
      stopped = true;
      controller?.abort();
      clearTimeout(timer);
    };
  }, [sourceUrl, feedRetry, lowLatency]);

  useEffect(() => {
    if (status !== "available") return;
    const video = videoRef.current;
    if (!video) return;
    let disposed = false;
    let hls;
    let stallTimer;
    let recovering = false;
    const playingRequested = () => {
      wantsPlayback.current = true;
      setBuffering(video.readyState < 3);
    };
    const resumeIfRequested = () => playIfRequested(video);
    const failed = () => {
      if (disposed || recovering) return;
      recovering = true;
      setPlaying(false);
      setBuffering(false);
      if (lowLatency) {
        setUsingFallback(true);
        setStatus("checking");
      } else if (!retriedPlayback.current) {
        retriedPlayback.current = true;
        setStatus("checking");
        setFeedRetry((value) => value + 1);
      } else {
        setPlayerError("Video terhenti. Coba sambungkan lagi.");
      }
    };
    const stalled = () => {
      if (!stallTimer && !video.paused) {
        setBuffering(true);
        stallTimer = setTimeout(failed, lowLatency ? 10000 : 18000);
      }
    };
    const clearStall = () => {
      clearTimeout(stallTimer);
      stallTimer = undefined;
    };
    const resumed = () => {
      clearStall();
      wantsPlayback.current = true;
      retriedPlayback.current = false;
      setPlayerError("");
      setBuffering(false);
      setPlaying(true);
      window.dispatchEvent(new CustomEvent("pauseRequested"));
    };
    const paused = () => {
      clearStall();
      if (!video.error && video.currentSrc) wantsPlayback.current = false;
      setBuffering(false);
      setPlaying(false);
    };

    video.addEventListener("play", playingRequested);
    video.addEventListener("canplay", resumeIfRequested);
    video.addEventListener("waiting", stalled);
    video.addEventListener("playing", resumed);
    video.addEventListener("pause", paused);
    video.addEventListener("error", failed);
    setPlayerError("");
    setPlaying(false);
    setBuffering(wantsPlayback.current);

    const useNativePlayer = () => {
      if (disposed) return;
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = sourceUrl;
        resumeIfRequested();
      } else {
        setPlayerError("Browser ini belum mendukung pemutaran video HLS.");
      }
    };
    import("hls.js").then(({ default: Hls }) => {
      if (disposed) return;
      if (!Hls.isSupported()) {
        useNativePlayer();
        return;
      }
      hls = new Hls({
        maxLiveSyncPlaybackRate: 1.08,
        lowLatencyMode: lowLatency,
        liveSyncDuration: lowLatency ? 4 : 8,
        liveMaxLatencyDuration: lowLatency ? 14 : 12,
      });
      hls.on(Hls.Events.MEDIA_ATTACHED, resumeIfRequested);
      hls.on(Hls.Events.ERROR, (_, error) => {
        if (error.fatal) failed();
      });
      hls.loadSource(sourceUrl);
      hls.attachMedia(video);
    }).catch(() => {
      hls?.destroy();
      hls = undefined;
      useNativePlayer();
    });
    return () => {
      disposed = true;
      clearStall();
      video.removeEventListener("play", playingRequested);
      video.removeEventListener("canplay", resumeIfRequested);
      video.removeEventListener("waiting", stalled);
      video.removeEventListener("playing", resumed);
      video.removeEventListener("pause", paused);
      video.removeEventListener("error", failed);
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [sourceUrl, status, lowLatency, playIfRequested]);

  useEffect(() => {
    const pauseForRadio = () => {
      wantsPlayback.current = false;
      setBuffering(false);
      videoRef.current?.pause();
    };
    window.addEventListener("radioPlayRequested", pauseForRadio);
    return () => window.removeEventListener("radioPlayRequested", pauseForRadio);
  }, []);

  useEffect(() => {
    const updateFullscreen = () => setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    const exitOnEscape = (event) => {
      if (event.key === "Escape") setExpanded(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", exitOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", exitOnEscape);
    };
  }, [expanded]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (wantsPlayback.current || !video.paused) {
      wantsPlayback.current = false;
      setBuffering(false);
      video.pause();
      return;
    }
    wantsPlayback.current = true;
    setBuffering(true);
    playIfRequested(video);
  };

  const toggleFullscreen = () => {
    if (expanded) {
      setExpanded(false);
    } else if (fullscreen) {
      document.exitFullscreen().catch(() => {});
    } else if (document.fullscreenEnabled && stageRef.current?.requestFullscreen) {
      stageRef.current.requestFullscreen().catch(() => setExpanded(true));
    } else {
      setExpanded(true);
    }
  };

  const listenToRadio = () => {
    wantsPlayback.current = false;
    setBuffering(false);
    videoRef.current?.pause();
    window.dispatchEvent(new CustomEvent("playRequested"));
  };

  const retryVideo = () => {
    retriedPlayback.current = false;
    setPlayerError("");
    setPlaying(false);
    setBuffering(false);
    setUsingFallback(false);
    setStatus("checking");
    setFeedRetry((value) => value + 1);
  };

  const canPlay = status === "available" && !playerError;
  const active = playing || buffering;
  const availableText = buffering ? "Memuat video…" : playing ? "Siaran video sedang diputar." : statuses.available;
  const statusText = status === "available"
    ? playerError || (usingFallback ? availableText + " Mode stabil." : availableText)
    : statuses[status];
  const stageMessage = !canPlay || buffering;
  const fullView = fullscreen || expanded;

  return (
    <div>
      <div className="aspect-video">
        <div
          ref={stageRef}
          className={expanded
            ? "fixed inset-0 z-[100] isolate overflow-hidden bg-black"
            : "relative isolate size-full overflow-hidden rounded-2xl bg-[#111215] shadow-xl shadow-black/10 ring-1 ring-black/10 fullscreen:rounded-none fullscreen:bg-black"}
        >
          {showVideo && (
            <video
              ref={videoRef}
              className="absolute inset-0 size-full object-contain"
              aria-label="Video siaran 8EH"
              muted={muted}
              playsInline
              preload="metadata"
            />
          )}
          <div aria-hidden="true" className={active && !stageMessage ? "pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/70 to-transparent" : "pointer-events-none absolute inset-0 bg-black/35"} />
          {canPlay && (
            <>
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-bold tracking-wider text-white backdrop-blur-sm sm:left-4 sm:top-4 sm:text-xs">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-[#f44349]" />
                LIVE
              </span>
              {usingFallback && (
                <span className={fullView
                  ? "absolute left-3 top-11 rounded-full bg-black/65 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm sm:left-4"
                  : "absolute right-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm sm:right-4 sm:top-4"}
                >
                  Mode stabil
                </span>
              )}
              <button
                type="button"
                aria-label={active ? "Jeda video" : "Putar video"}
                title={active ? "Jeda video" : "Putar video"}
                onClick={togglePlayback}
                className={active
                  ? controlStyle + " absolute bottom-3 left-3 sm:bottom-4 sm:left-4"
                  : "absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#c7272c] text-white shadow-lg shadow-black/40 ring-1 ring-white/25 transition-[background-color,scale] hover:scale-105 hover:bg-[#dc3237] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:size-20 motion-reduce:transition-none"}
              >
                {active ? <FiPause aria-hidden="true" size={18} /> : <FaPlay aria-hidden="true" className="ml-1 size-5 sm:size-6" />}
              </button>
            </>
          )}
          {(canPlay || fullView) && (
            <div className={fullView
              ? "absolute right-3 top-3 flex items-center gap-2 sm:right-4 sm:top-4"
              : "absolute bottom-3 right-3 flex items-center gap-2 sm:bottom-4 sm:right-4"}
            >
              {canPlay && (
                <button
                  type="button"
                  aria-label={muted ? "Nyalakan suara" : "Matikan suara"}
                  title={muted ? "Nyalakan suara" : "Matikan suara"}
                  onClick={() => setMuted((value) => !value)}
                  className={controlStyle}
                >
                  {muted ? <FiVolumeX aria-hidden="true" size={18} /> : <FiVolume2 aria-hidden="true" size={18} />}
                </button>
              )}
              <button
                type="button"
                aria-label={fullView ? "Keluar dari layar penuh" : "Layar penuh"}
                title={fullView ? "Keluar dari layar penuh" : "Layar penuh"}
                onClick={toggleFullscreen}
                className={controlStyle}
              >
                {fullView ? <FiMinimize aria-hidden="true" size={17} /> : <FiMaximize aria-hidden="true" size={17} />}
              </button>
            </div>
          )}
          {stageMessage && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center px-5 text-center text-sm font-medium text-white sm:text-base">
              <div className="grid justify-items-center gap-3">
                {(status === "checking" || status === "unreachable" || buffering) && <FiLoader className="size-6 animate-spin motion-reduce:animate-none" />}
                {statusText}
              </div>
            </div>
          )}
        </div>
      </div>
      <p role="status" className="sr-only">{statusText}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {(playerError || status === "offline" || status === "unreachable") && (
          <button type="button" className="font-semibold text-red-700 underline" onClick={retryVideo}>
            Coba lagi
          </button>
        )}
        {usingFallback && status === "available" && !playerError && (
          <button type="button" className="font-semibold text-red-700 underline" onClick={retryVideo}>
            Coba LL-HLS lagi
          </button>
        )}
        <button type="button" onClick={listenToRadio} className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100">
          <FiRadio aria-hidden="true" size={16} />
          Dengarkan radio
        </button>
      </div>
    </div>
  );
}
