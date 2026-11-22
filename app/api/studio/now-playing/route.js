import { NextResponse } from "next/server";
import { publishNowPlaying } from "@/lib/pusher";
import {
  getCurrentNowPlaying,
  upsertNowPlayingState,
  clearNowPlayingState,
} from "@/lib/now-playing-state";
import { authenticateDevice, checkMetadataOwnership } from "@/lib/studio-devices";
import { findItunesArtwork } from "@/lib/itunes-artwork";
import { chooseStudioCover } from "@/lib/studio-artwork";

// POST /api/studio/now-playing
// Endpoint untuk app 8EH Studio — auth via X-Device-Token:
//   1) token per-device (StudioDevice.token, hasil login) → cek scope + kepemilikan
//   2) token global lama (STUDIO_DEVICE_TOKEN) → kompatibilitas dev/test
//
// Body: { mode: "auto"|"program"|"clear"|"heartbeat", title, artist?, playbackState?, artwork?: { mimeType, data } }
//
// Ownership berlapis:
//   a. control="manual" (dashboard lock) → agent ditolak 409
//   b. activeDeviceId diset dashboard → HANYA device terpilih yang boleh
//      menulis; device lain 409 { error: "device-not-selected" }
// Heartbeat: mode tanpa title — hanya memperbarui updatedAt agar state agent
// tidak dianggap basi oleh getCurrentNowPlaying().

export const dynamic = "force-dynamic";

const MAX_TEXT = 300;

function cleanText(value) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_TEXT);
}

async function resolveAuth(req) {
  // return { device: null } + flag legacy, atau device per-link
  const provided =
    req.headers.get("x-device-token") ||
    (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!provided) return { device: null, legacy: false };

  const expected = process.env.STUDIO_DEVICE_TOKEN;
  if (expected && provided === expected) {
    return { device: null, legacy: true }; // token global lama: selalu boleh
  }

  const device = await authenticateDevice(provided);
  if (!device) return { device: null, legacy: false };
  return { device, legacy: false };
}

async function isDashboardLockActive() {
  const { prisma } = await import("@/lib/prisma");
  const state = await prisma.nowPlayingState.findUnique({
    where: { key: "main" },
  });
  return state?.control === "manual";
}

export async function POST(req) {
  const { device, legacy } = await resolveAuth(req);
  if (!device && !legacy) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const mode = cleanText(body?.mode) || "auto";

  // Gate kepemilikan device (hanya untuk device login; token global bypass)
  if (device) {
    if (!device.metadataEnabled) {
      return NextResponse.json(
        { error: "metadata-disabled-for-this-device" },
        { status: 403 },
      );
    }
    const ownership = await checkMetadataOwnership(device.deviceId);
    if (!ownership.allowed) {
      return NextResponse.json(
        { error: ownership.reason }, // "device-not-selected"
        { status: 409 },
      );
    }
  }

  try {
    // Heartbeat: tanpa title, hanya refresh timestamp supaya state agent
    // tidak dianggap basi oleh getCurrentNowPlaying(). Tidak publish.
    if (mode === "heartbeat") {
      if (await isDashboardLockActive()) {
        return NextResponse.json({ accepted: false, locked: true });
      }
      const { prisma } = await import("@/lib/prisma");
      await prisma.nowPlayingState.updateMany({
        where: {
          key: "main",
          OR: [
            { control: "agent-auto" },
            { control: "agent-program" },
          ],
        },
        data: { updatedAt: new Date() },
      });
      return NextResponse.json({ accepted: true });
    }

    if (mode === "clear") {
      if (await isDashboardLockActive()) {
        return NextResponse.json(
          { error: "Dashboard has manual control" },
          { status: 409 },
        );
      }
      await clearNowPlayingState("studio-agent", "companion-agent");
    } else if (mode === "program") {
      if (await isDashboardLockActive()) {
        return NextResponse.json(
          { error: "Dashboard has manual control" },
          { status: 409 },
        );
      }
      const title = cleanText(body?.title);
      if (!title) {
        return NextResponse.json(
          { error: "title is required for program mode" },
          { status: 400 },
        );
      }
      await upsertNowPlayingState({
        source: "studio-program",
        playlistId: null,
        itemId: null,
        title,
        artist: cleanText(body?.artist),
        coverImage: null,
        isActive: true,
        startedAt: new Date(),
        updatedBy: "companion-agent",
        control: "agent-program",
      });
    } else if (mode === "auto") {
      if (await isDashboardLockActive()) {
        return NextResponse.json(
          { error: "Dashboard has manual control" },
          { status: 409 },
        );
      }
      const title = cleanText(body?.title);
      const playbackState = cleanText(body?.playbackState);
      if (!title) {
        return NextResponse.json(
          { error: "title is required" },
          { status: 400 },
        );
      }
      if (playbackState && playbackState !== "Playing") {
        // lagu dipause/stop — jangan tampilkan judul yang basi.
        // Agent bertanggung jawab mengirim "clear" atau track berikutnya.
        return NextResponse.json(
          { skipped: true, reason: "playback not active" },
          { status: 200 },
        );
      }
      const artist = cleanText(body?.artist);
      const coverImage = await chooseStudioCover(body?.artwork, title, artist, {
        lookup: findItunesArtwork,
      });
      // Dashboard may have taken manual control while the iTunes request ran.
      if (await isDashboardLockActive()) {
        return NextResponse.json(
          { error: "Dashboard has manual control" },
          { status: 409 },
        );
      }
      await upsertNowPlayingState({
        source: "studio-agent",
        playlistId: null,
        itemId: null,
        title,
        artist,
        coverImage,
        isActive: true,
        startedAt: new Date(),
        updatedBy: "companion-agent",
        control: "agent-auto",
      });
    } else {
      return NextResponse.json(
        { error: "mode must be auto, program, clear, or heartbeat" },
        { status: 400 },
      );
    }

    const payload = await getCurrentNowPlaying();
    await publishNowPlaying(payload).catch((error) => {
      console.error("Failed to publish now playing update:", error);
    });
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Failed to update studio now playing:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
