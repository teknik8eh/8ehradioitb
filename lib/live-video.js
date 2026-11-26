export function getLiveVideoUpstream(useStandard = false) {
  try {
    const devUrl = !useStandard && process.env.NODE_ENV === "development"
      ? process.env.LIVE_VIDEO_DEV_HLS_URL
      : undefined;
    const url = new URL(devUrl || process.env.LIVE_VIDEO_HLS_URL);
    const allowedProtocol = devUrl
      ? ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) &&
        ["http:", "https:"].includes(url.protocol)
      : url.protocol === "https:";
    if (
      allowedProtocol &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname.endsWith(".m3u8")
    ) {
      return url;
    }
  } catch {
    return null;
  }
  return null;
}

export function getLiveVideoUrl() {
  const upstream = getLiveVideoUpstream();
  if (!upstream) return null;
  if (process.env.NODE_ENV === "development" && process.env.LIVE_VIDEO_DEV_HLS_URL) {
    return "/api/live-video-hls/" + upstream.pathname.split("/").pop();
  }
  return upstream.href;
}

export function getLiveVideoFallbackUrl() {
  if (process.env.NODE_ENV !== "development" || !process.env.LIVE_VIDEO_DEV_HLS_URL) {
    return null;
  }
  const upstream = getLiveVideoUpstream(true);
  return upstream ? "/api/live-video-hls/standard/" + upstream.pathname.split("/").pop() : null;
}
