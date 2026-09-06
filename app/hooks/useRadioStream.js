// app/hooks/useRadioStream.js
import { useState, useEffect, useCallback, useMemo } from "react";
import useSWR from "swr";

const fetcher = (...args) => fetch(...args).then((res) => res.json());
const DEFAULT_STREAM_URL =
  "http://stream.8ehradioitb.com/listen/8eh_radio_itb/radio.mp3";

function normalizeStreamUrl(url) {
  const cleaned = typeof url === "string" ? url.trim() : "";
  if (!cleaned) return DEFAULT_STREAM_URL;
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  return `https://${cleaned.replace(/^\/+/, "")}`;
}

function addNoCache(url, code) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}nocache=${code}`;
}

function toBrowserPlayableUrl(url) {
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    url.startsWith("http://")
  ) {
    return `/api/stream?url=${encodeURIComponent(url)}`;
  }
  return url;
}

function isDirectStreamUrl(url) {
  return (
    url.includes("?") ||
    url.includes("/listen/") ||
    url.endsWith(".mp3") ||
    /\/stream\/[^/?#]+$/i.test(url)
  );
}

export const useRadioStream = () => {
  const [streamUrl, setStreamUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const { data: configData } = useSWR("/api/stream-config", fetcher, {
    refreshInterval: 30000,
  });

  const config = useMemo(
    () => ({
      defaultUrl: normalizeStreamUrl(configData?.defaultUrl),
      fallbackUrl: normalizeStreamUrl(configData?.fallbackUrl),
    }),
    [configData],
  );

  // Configuration for the streaming service
  const STREAM_CONFIG = useMemo(
    () => ({
      baseUrl: config.defaultUrl,
      fallbackUrl: config.fallbackUrl,
      maxRetries: 3,
      retryDelay: 2000,
    }),
    [config],
  );

  // Generate dynamic stream URL similar to embed player
  const generateStreamUrl = useCallback(() => {
  const randomCode = Math.random().toString(36).substring(2, 8);
  const baseUrl = STREAM_CONFIG.baseUrl;
  
  // Kalau direct stream URL, cukup tambah query param nocache.
  if (isDirectStreamUrl(baseUrl)) {
    return toBrowserPlayableUrl(addNoCache(baseUrl, randomCode));
  }
  
  // Kalau Shoutcast/Icecast, pakai format lama
  return toBrowserPlayableUrl(`${baseUrl}/;?type=http&nocache=${randomCode}`);
}, [STREAM_CONFIG.baseUrl]);


  // Detect if running on an iOS device (iPhone, iPod, iPad)
  // isIOS tidak lagi digunakan untuk menentukan URL streaming
  // const isIOS =
  //   typeof window !== "undefined" &&
  //   /iP(hone|od|ad)/i.test(window.navigator.userAgent);

  // Initialize stream URL
  useEffect(() => {
    // Selalu gunakan generateStreamUrl untuk semua perangkat
    const url = generateStreamUrl();
    setStreamUrl(url);
    // eslint-disable-next-line
  }, [generateStreamUrl]); // Hapus isIOS dari dependencies

  // Refresh stream URL
  const refreshStream = useCallback(() => {
    setError("");
    setRetryCount(0);
    const newUrl = generateStreamUrl();
    setStreamUrl(newUrl);
    return newUrl;
  }, [generateStreamUrl]);

  // Handle stream errors with fallback logic
  const handleStreamError = useCallback(() => {
  setIsLoading(false);

  if (retryCount === 0) {
    setError("Primary connection failed. Switching to fallback stream...");
    setRetryCount((prev) => prev + 1);
    const randomCode = Math.random().toString(36).substring(2, 8);
    const fallbackUrl = STREAM_CONFIG.fallbackUrl;
    
    // Sama seperti generateStreamUrl, deteksi direct stream URL.
    if (isDirectStreamUrl(fallbackUrl)) {
      setStreamUrl(toBrowserPlayableUrl(addNoCache(fallbackUrl, randomCode)));
    } else {
      setStreamUrl(
        toBrowserPlayableUrl(
          `${fallbackUrl}/;?type=http&nocache=${randomCode}`,
        ),
      );
    }
    return;
  }

  if (retryCount < STREAM_CONFIG.maxRetries) {
    setError(`Connection failed. Retrying... (${retryCount + 1}/${STREAM_CONFIG.maxRetries})`);
    setTimeout(() => {
      setRetryCount((prev) => prev + 1);
      const newUrl = generateStreamUrl();
      setStreamUrl(newUrl);
    }, STREAM_CONFIG.retryDelay);
  } else {
    setError("Unable to connect to the radio stream. Please try refreshing.");
  }
}, [
  retryCount,
  generateStreamUrl,
  STREAM_CONFIG.fallbackUrl,
  STREAM_CONFIG.maxRetries,
  STREAM_CONFIG.retryDelay,
]);


  // Get stream URL with fresh session (tidak lagi menggunakan isIOS kondisional)
  const getStreamUrl = useCallback(() => {
    return generateStreamUrl(); // Selalu panggil generateStreamUrl
  }, [generateStreamUrl]);

  return {
    streamUrl,
    isLoading,
    error,
    retryCount,
    refreshStream,
    handleStreamError,
    getStreamUrl,
    setIsLoading,
    setError,
  };
};
