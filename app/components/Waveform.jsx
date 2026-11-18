"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import WaveSurfer from "wavesurfer.js";

const Waveform = ({ audioUrl, announcerName }) => {
  const waveformContainerRef = useRef(null);
  const wavesurferRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (waveformContainerRef.current) {
      const ws = WaveSurfer.create({
        container: waveformContainerRef.current,
        waveColor: "rgb(209 213 219)",
        progressColor: "rgb(249 115 22)",
        url: audioUrl,
        cursorColor: "transparent",
        barWidth: 3,
        barRadius: 3,
        barGap: 2,
        height: 40, // Sedikit mengurangi tinggi agar pas
      });

      wavesurferRef.current = ws;

      ws.on("ready", () => setIsLoading(false));
      // Sembunyikan player jika audio tidak ada / gagal dimuat (mis. 404 di bucket)
      ws.on("error", () => {
        setHasError(true);
        setIsLoading(false);
      });
      ws.on("play", () => setIsPlaying(true));
      ws.on("pause", () => setIsPlaying(false));

      return () => {
        ws.destroy();
      };
    }
  }, [audioUrl]);

  const handlePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  // Jika audio tidak tersedia di bucket, jangan render player sama sekali
  if (hasError) return null;

  return (
    // Container utama: flexbox horizontal untuk 2 kolom
    <div className="w-full flex items-center space-x-4">
      {/* Kolom Kiri: Tombol Play/Pause */}
      <button
        onClick={handlePlayPause}
        disabled={isLoading}
        className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        ) : isPlaying ? (
          <Image src="/pause.svg" alt="Pause" width={16} height={16} />
        ) : (
          <Image
            src="/play-button-arrowhead.svg"
            alt="Play"
            width={12}
            height={12}
          />
        )}
      </button>

      {/* Kolom Kanan: flexbox vertikal untuk waveform dan teks */}
      <div className="w-full flex flex-col">
        {/* Bagian atas kolom kanan: Waveform */}
        <div ref={waveformContainerRef} className="w-full cursor-pointer" />

        {/* Bagian bawah kolom kanan: Label Suara */}
        <span className="font-semibold text-xs text-gray-900 mt-1">
          Sample Voice - {announcerName}
        </span>
      </div>
    </div>
  );
};

export default Waveform;