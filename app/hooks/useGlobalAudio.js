// File: app/hooks/useGlobalAudio.js
import { useEffect, useRef } from "react";

// Satu instance audio untuk seluruh aplikasi
let audioInstance = null;

export const useGlobalAudio = () => {
  const audioRef = useRef(null);

  if (typeof window !== "undefined" && !audioInstance) {
    audioInstance = new Audio();
    audioInstance.preload = "none";
    audioInstance.playsInline = true;
  }

  useEffect(() => {
    audioRef.current = audioInstance;
  }, []);

  return audioRef;
};
