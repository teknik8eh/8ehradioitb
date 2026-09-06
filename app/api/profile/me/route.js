import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import {
  getPhoneFieldKeySet,
  normalizeBiodataPhones,
} from "@/lib/profile/phone";
import { deleteR2ObjectKeys } from "@/lib/storage/r2";
import { extractFileKeysFromValue as extractProfileFileKeys } from "@/lib/profile/database";
import { reportCriticalError } from "@/lib/observability/critical";

function hasMeaningfulValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [profile, fields] = await Promise.all([
      prisma.participantProfile.findUnique({
        where: { userId: session.user.id },
      }),
      prisma.profileFieldCatalog.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),
    ]);

    return NextResponse.json({
      profile,
      fields,
    });
  } catch (error) {
    console.error("Failed to fetch profile:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const biodataInput =
      body?.biodata && typeof body.biodata === "object" && !Array.isArray(body.biodata)
        ? body.biodata
        : null;

    if (!biodataInput) {
      return NextResponse.json(
        { error: "biodata must be an object" },
        { status: 400 },
      );
    }

    const [currentProfile, catalogFields] = await Promise.all([
      prisma.participantProfile.findUnique({
        where: { userId: session.user.id },
        select: {
          biodata: true,
        },
      }),
      prisma.profileFieldCatalog.findMany({
        where: {
          isActive: true,
        },
        select: {
          key: true,
          fieldType: true,
          isRequired: true,
        },
      }),
    ]);

    const currentBiodata =
      currentProfile?.biodata &&
      typeof currentProfile.biodata === "object" &&
      !Array.isArray(currentProfile.biodata)
        ? currentProfile.biodata
        : {};

    const mergedBiodataRaw = {
      ...currentBiodata,
      ...biodataInput,
    };
    const phoneFieldKeySet = getPhoneFieldKeySet(catalogFields);
    const mergedBiodata = normalizeBiodataPhones(mergedBiodataRaw, {
      phoneFieldKeySet,
      includePhoneLikeKeys: true,
    });

    const missingRequired = catalogFields
      .filter((field) => field.isRequired)
      .filter((field) => !hasMeaningfulValue(mergedBiodata[field.key]))
      .map((field) => field.key);

    if (missingRequired.length > 0 && body?.allowPartial !== true) {
      return NextResponse.json(
        {
          error: "missing_required_fields",
          missingFields: missingRequired,
        },
        { status: 400 },
      );
    }

    const displayName =
      typeof mergedBiodata.fullName === "string" && mergedBiodata.fullName.trim()
        ? mergedBiodata.fullName.trim()
        : session.user.name ?? null;

    const profile = await prisma.participantProfile.upsert({
      where: { userId: session.user.id },
      update: {
        displayName,
        biodata: mergedBiodata,
      },
      create: {
        userId: session.user.id,
        displayName,
        biodata: mergedBiodata,
      },
    });

    const fileFieldKeys = catalogFields
      .filter((field) => field.fieldType === "file")
      .map((field) => field.key);

    if (fileFieldKeys.length > 0) {
      const staleFileKeys = [];
      for (const key of fileFieldKeys) {
        const previousKeys = new Set(extractProfileFileKeys(currentBiodata[key]));
        const nextKeys = new Set(extractProfileFileKeys(mergedBiodata[key]));
        for (const previousKey of previousKeys) {
          if (!nextKeys.has(previousKey)) {
            staleFileKeys.push(previousKey);
          }
        }
      }

      if (staleFileKeys.length > 0) {
        try {
          const cleanup = await deleteR2ObjectKeys(staleFileKeys);
          if (cleanup.failed.length > 0) {
            await reportCriticalError({
              source: "api/profile/me:cleanup",
              message: "Failed to delete stale profile files",
              context: {
                userId: session.user.id,
                failed: cleanup.failed,
              },
            });
          }
        } catch (cleanupError) {
          await reportCriticalError({
            source: "api/profile/me:cleanup",
            message: "Unexpected error while deleting stale profile files",
            error: cleanupError,
            context: {
              userId: session.user.id,
              staleFileKeys,
            },
          });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      profile,
      missingFields: missingRequired,
    });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
