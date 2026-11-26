export function getLiveVideoUrl() {
  try {
    const url = new URL(process.env.LIVE_VIDEO_HLS_URL);
    if (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname.endsWith(".m3u8")
    ) {
      return url.href;
    }
  } catch {
    return null;
  }
  return null;
}
