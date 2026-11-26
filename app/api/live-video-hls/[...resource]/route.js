import { getLiveVideoUpstream } from "@/lib/live-video";

export async function GET(request, { params }) {
  if (process.env.NODE_ENV !== "development" || !process.env.LIVE_VIDEO_DEV_HLS_URL) {
    return new Response(null, { status: 404 });
  }

  const { resource } = await params;
  const useStandard = resource.length === 2 && resource[0] === "standard";
  if (!useStandard && resource.length !== 1) {
    return new Response(null, { status: 404 });
  }
  const upstream = getLiveVideoUpstream(useStandard);
  const file = resource.at(-1);
  if (!upstream || !/^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/.test(file)) {
    return new Response(null, { status: 404 });
  }

  // MediaMTX playlists reference renditions and segments in the same directory.
  const url = new URL(file, upstream);
  url.search = new URL(request.url).search;
  const range = request.headers.get("range");
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: range ? { range } : undefined,
      signal: request.signal,
    });
    const headers = new Headers({ "cache-control": "no-store" });
    for (const name of ["content-type", "content-range", "accept-ranges"]) {
      const value = response.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(response.body, { status: response.status, headers });
  } catch {
    return new Response(null, { status: 502 });
  }
}
