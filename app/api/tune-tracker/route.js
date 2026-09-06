import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { hasAnyRole } from "@/lib/roleUtils";

const ALLOWED_SOURCE_TYPES = new Set(["MANUAL", "ITUNES", "AUDIO_URL"]);

function isMusic(roleString) {
  return hasAnyRole(roleString, ["MUSIC", "DEVELOPER"]);
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function toNonEmptyString(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed;
}

function deriveSourceType({ audioUrl, itunesPreviewUrl }) {
  const hasItunesPreview = Boolean(toNonEmptyString(itunesPreviewUrl));
  if (hasItunesPreview) return "ITUNES";

  const hasAudioUrl = Boolean(toNonEmptyString(audioUrl));
  if (hasAudioUrl) return "AUDIO_URL";

  return "MANUAL";
}

function normalizeSourceTypeInput(sourceType, fallbackContext) {
  if (sourceType === undefined || sourceType === null || sourceType === "") {
    return {
      valid: true,
      value: deriveSourceType(fallbackContext),
      error: "",
    };
  }

  if (typeof sourceType !== "string") {
    return {
      valid: false,
      value: null,
      error: "sourceType must be a string",
    };
  }

  const normalized = sourceType.trim().toUpperCase();
  if (!ALLOWED_SOURCE_TYPES.has(normalized)) {
    return {
      valid: false,
      value: null,
      error: "sourceType must be one of MANUAL, ITUNES, AUDIO_URL",
    };
  }

  return {
    valid: true,
    value: normalized,
    error: "",
  };
}

function internalServerError(message, error) {
  console.error(message, error);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 },
  );
}

// GET: List all 10 entries, sorted by order
export async function GET() {
  try {
    const entries = await prisma.tuneTrackerEntry.findMany({
      orderBy: { order: "asc" },
    });
    return NextResponse.json(entries);
  } catch (error) {
    return internalServerError("Failed to fetch tune tracker entries:", error);
  }
}

// POST: Create or update one entry (by order)
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isMusic(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const {
      order,
      title,
      artist,
      coverImage,
      audioUrl,
      itunesPreviewUrl,
      itunesTrackId,
      sourceType,
    } = await req.json();
    if (!order || !title || !artist) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const sourceTypeValidation = normalizeSourceTypeInput(sourceType, {
      audioUrl,
      itunesPreviewUrl,
    });
    if (!sourceTypeValidation.valid) {
      return NextResponse.json(
        { error: sourceTypeValidation.error },
        { status: 400 },
      );
    }

    let entry = await prisma.tuneTrackerEntry.findFirst({ where: { order } });
    if (entry) {
      entry = await prisma.tuneTrackerEntry.update({
        where: { id: entry.id },
        data: {
          title,
          artist,
          coverImage,
          audioUrl,
          itunesPreviewUrl,
          itunesTrackId,
          sourceType: sourceTypeValidation.value,
        },
      });
    } else {
      entry = await prisma.tuneTrackerEntry.create({
        data: {
          order,
          title,
          artist,
          coverImage,
          audioUrl,
          itunesPreviewUrl,
          itunesTrackId,
          sourceType: sourceTypeValidation.value,
        },
      });
    }
    return NextResponse.json(entry);
  } catch (error) {
    return internalServerError("Failed to upsert tune tracker entry:", error);
  }
}

// PATCH: Partial update (by id)
export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isMusic(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id, ...rawData } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // Whitelist patchable fields — reject anything outside this set
    const PATCHABLE_FIELDS = new Set([
      "title", "artist", "coverImage", "audioUrl",
      "itunesPreviewUrl", "itunesTrackId", "sourceType",
    ]);
    const data = {};
    for (const key of Object.keys(rawData)) {
      if (PATCHABLE_FIELDS.has(key)) {
        data[key] = rawData[key];
      }
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }
    const touchesSourceState =
      hasOwn(data, "sourceType") ||
      hasOwn(data, "audioUrl") ||
      hasOwn(data, "itunesPreviewUrl");

    if (touchesSourceState) {
      const existing = await prisma.tuneTrackerEntry.findUnique({
        where: { id },
        select: {
          audioUrl: true,
          itunesPreviewUrl: true,
        },
      });

      if (!existing) {
        return NextResponse.json({ error: "Entry not found" }, { status: 404 });
      }

      const mergedAudioUrl = hasOwn(data, "audioUrl")
        ? data.audioUrl
        : existing.audioUrl;
      const mergedItunesPreviewUrl = hasOwn(data, "itunesPreviewUrl")
        ? data.itunesPreviewUrl
        : existing.itunesPreviewUrl;

      const sourceTypeValidation = normalizeSourceTypeInput(data.sourceType, {
        audioUrl: mergedAudioUrl,
        itunesPreviewUrl: mergedItunesPreviewUrl,
      });
      if (!sourceTypeValidation.valid) {
        return NextResponse.json(
          { error: sourceTypeValidation.error },
          { status: 400 },
        );
      }

      data.sourceType = sourceTypeValidation.value;

      // Cascade-clear itunesTrackId when itunesPreviewUrl is being nulled
      if (
        hasOwn(data, "itunesPreviewUrl") &&
        !toNonEmptyString(data.itunesPreviewUrl)
      ) {
        data.itunesTrackId = null;
      }
    }

    const entry = await prisma.tuneTrackerEntry.update({ where: { id }, data });
    return NextResponse.json(entry);
  } catch (error) {
    return internalServerError("Failed to update tune tracker entry:", error);
  }
}

// DELETE: Remove cover or audio from entry (by id, field)
export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isMusic(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id, field } = await req.json();
    if (!id || !["coverImage", "audioUrl", "itunesPreviewUrl"].includes(field)) {
      return NextResponse.json(
        { error: "Missing id or invalid field" },
        { status: 400 },
      );
    }

    const existing = await prisma.tuneTrackerEntry.findUnique({
      where: { id },
      select: { audioUrl: true, itunesPreviewUrl: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const data = { [field]: null };

    if (field === "itunesPreviewUrl") {
      data.itunesTrackId = null;
      data.sourceType = existing.audioUrl ? "AUDIO_URL" : "MANUAL";
    }

    if (field === "audioUrl") {
      data.sourceType = existing.itunesPreviewUrl ? "ITUNES" : "MANUAL";
    }

    const entry = await prisma.tuneTrackerEntry.update({
      where: { id },
      data,
    });
    return NextResponse.json(entry);
  } catch (error) {
    return internalServerError("Failed to delete tune tracker entry field:", error);
  }
}
