import { prisma } from "@/lib/prisma";

// Helper bersama state Now Playing — dipakai route dashboard (session auth)
// maupun route studio agent (device token). Bentuk payload di sini adalah
// kontrak yang dibaca widget GlobalAudioPlayer; ubah dengan hati-hati.

export const STATE_KEY = "main";

export async function getFallbackPayload() {
  const config = await prisma.playerConfig.findFirst();
  return {
    source: "fallback",
    title: config?.title || "8EH Radio ITB",
    artist: config?.subtitle || "Live Now",
    coverImage: config?.coverImage || "/8eh.png",
    isActive: false,
    playlistId: null,
    itemId: null,
    startedAt: null,
    updatedAt: config?.updatedAt || null,
  };
}

export function statePayload(state, coverImage) {
  if (!state?.isActive || !state.title) return null;

  return {
    source: state.source,
    title: state.title,
    artist: state.artist || "",
    coverImage: state.coverImage || coverImage || "/8eh.png",
    isActive: true,
    playlistId: state.playlistId || null,
    itemId: state.itemId || null,
    startedAt: state.startedAt,
    updatedAt: state.updatedAt,
  };
}

export async function getCurrentNowPlaying() {
  const [state, fallback] = await Promise.all([
    prisma.nowPlayingState.findUnique({ where: { key: STATE_KEY } }),
    getFallbackPayload(),
  ]);

  // state dari companion dianggap basi kalau agent tidak heartbeat lagi
  // (3 menit; agent heartbeat tiap 60 detik saat Companion Tahap 3).
  if (
    state?.isActive &&
    (state.source === "studio-agent" || state.source === "studio-program")
  ) {
    const ageMs = Date.now() - new Date(state.updatedAt).getTime();
    if (ageMs > 3 * 60 * 1000) return fallback;
  }

  return statePayload(state, fallback.coverImage) || fallback;
}

export async function upsertNowPlayingState(data) {
  return prisma.nowPlayingState.upsert({
    where: { key: STATE_KEY },
    update: data,
    create: {
      key: STATE_KEY,
      ...data,
    },
  });
}

export async function clearNowPlayingState(source, updatedBy) {
  return upsertNowPlayingState({
    source,
    playlistId: null,
    itemId: null,
    title: null,
    artist: null,
    coverImage: null,
    isActive: false,
    startedAt: null,
    updatedBy,
    control: null,
  });
}
