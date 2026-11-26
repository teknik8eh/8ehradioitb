"use client";

import { useEffect, useRef, useState } from "react";

const statuses = {
  checking: "Memeriksa siaran video…",
  available: "Tekan Play untuk menonton.",
  offline: "Siaran video sedang offline.",
  unavailable: "Siaran video belum tersedia.",
};

export default function LiveVideoPlayer({ url }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState(url ? "checking" : "unavailable");
  const [playing, setPlaying] = useState(false);
  const [playerError, setPlayerError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!url) return;
    let stopped = false;
    let controller;
    let timer;
    let failures = 0;
    async function checkFeed() {
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      try {
        const response = await fetch(url, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Playlist unavailable");
        const playlist = await response.text();
        if (!playlist.startsWith("#EXTM3U") || playlist.includes("#EXT-X-ENDLIST")) {
          throw new Error("Live playlist unavailable");
        }
        if (!stopped) {
          failures = 0;
          setStatus("available");
        }
      } catch {
        if (!stopped) {
          failures += 1;
          setStatus((previous) => previous === "available" && failures < 2 ? previous : "offline");
        }
      } finally {
        clearTimeout(timeout);
        if (!stopped) timer = setTimeout(checkFeed, 8000);
      }
    }
    checkFeed();
    return () => {
      stopped = true;
      controller?.abort();
      clearTimeout(timer);
    };
  }, [url]);

  useEffect(() => {
    if (status !== "available") return;
    const video = videoRef.current;
    if (!video) return;
    let disposed = false;
    let hls;
    let stallTimer;
    const stalled = () => {
      clearTimeout(stallTimer);
      if (!video.paused) {
        stallTimer = setTimeout(() => {
          setPlayerError("Pemutaran video terhenti. Coba muat ulang video.");
        }, 15000);
      }
    };
    const clearStall = () => clearTimeout(stallTimer);
    const resumed = () => {
      clearStall();
      setPlayerError("");
      setPlaying(true);
      window.dispatchEvent(new CustomEvent("pauseRequested"));
    };
    const paused = () => {
      clearStall();
      setPlaying(false);
    };
    const failed = () => setPlayerError("Video gagal diputar. Coba muat ulang video.");
    const pauseForRadio = () => video.pause();

    video.addEventListener("waiting", stalled);
    video.addEventListener("playing", resumed);
    video.addEventListener("pause", paused);
    video.addEventListener("error", failed);
    window.addEventListener("radioPlayRequested", pauseForRadio);
    setPlayerError("");
    setPlaying(false);

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
    } else {
      import("hls.js").then(({ default: Hls }) => {
        if (disposed) return;
        if (!Hls.isSupported()) {
          setPlayerError("Browser ini belum mendukung pemutaran video HLS.");
          return;
        }
        hls = new Hls();
        hls.on(Hls.Events.ERROR, (_, error) => {
          if (error.fatal) failed();
        });
        hls.loadSource(url);
        hls.attachMedia(video);
      }).catch(() => {
        if (!disposed) failed();
      });
    }
    return () => {
      disposed = true;
      clearStall();
      window.removeEventListener("radioPlayRequested", pauseForRadio);
      video.removeEventListener("waiting", stalled);
      video.removeEventListener("playing", resumed);
      video.removeEventListener("pause", paused);
      video.removeEventListener("error", failed);
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [url, status, retry]);

  const listenToRadio = () => {
    videoRef.current?.pause();
    window.dispatchEvent(new CustomEvent("playRequested"));
  };

  return (
    <div>
      {status === "available" && (
        <video
          ref={videoRef}
          className="aspect-video w-full rounded-xl bg-black"
          aria-label="Video siaran 8EH"
          controls
          playsInline
          preload="metadata"
        />
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <p role="status" className="font-body text-gray-700">
          {status === "available" ? playerError || (playing ? "Siaran video sedang diputar." : statuses.available) : statuses[status]}
        </p>
        {status === "available" && playerError && (
          <button type="button" className="font-semibold text-red-700 underline" onClick={() => setRetry((value) => value + 1)}>
            Muat ulang video
          </button>
        )}
        <button type="button" onClick={listenToRadio} className="rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-900 hover:bg-gray-100">
          Dengarkan radio
        </button>
      </div>
    </div>
  );
}
