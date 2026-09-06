import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { hasAnyRole } from "@/lib/roleUtils";
import {
  applyProfileFilters,
  buildProfileFieldDefinitions,
} from "@/lib/profile/database";
import {
  getPhoneFieldKeySet,
  normalizeBiodataPhones,
} from "@/lib/profile/phone";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAnyRole(session.user.role, ["DATA", "DEVELOPER"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const role = (searchParams.get("role") || "").trim().toUpperCase();
    const completeness = (searchParams.get("completeness") || "all").trim();
    const fieldKey = (searchParams.get("fieldKey") || "").trim();
    const fieldValue = (searchParams.get("fieldValue") || "").trim();
    const limitRaw = Number(searchParams.get("limit") || "500");
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0
        ? Math.min(Math.max(Math.floor(limitRaw), 1), 5000)
        : 500;

    const [catalogFields, profiles] = await Promise.all([
      prisma.profileFieldCatalog.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          key: true,
          label: true,
          fieldType: true,
          isRequired: true,
          isActive: true,
        },
      }),
      prisma.participantProfile.findMany({
        orderBy: {
          updatedAt: "desc",
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    const fieldDefinitions = buildProfileFieldDefinitions({
      catalogFields,
      profiles,
      includeUnknownProfileKeys: false,
    });
    const allowedFieldKeySet = new Set(fieldDefinitions.map((field) => field.key));
    const requiredKeys = catalogFields
      .filter((field) => field.isActive && field.isRequired)
      .map((field) => field.key);

    const filtered = applyProfileFilters({
      profiles,
      q,
      role,
      completeness:
        completeness === "complete" || completeness === "incomplete"
          ? completeness
          : "all",
      fieldKey: allowedFieldKeySet.has(fieldKey) ? fieldKey : "",
      fieldValue,
      requiredKeys,
    });

    const limitedItems = filtered.slice(0, limit);

    return NextResponse.json({
      total: profiles.length,
      filteredTotal: filtered.length,
      limit,
      hasMore: filtered.length > limitedItems.length,
      fields: fieldDefinitions,
      requiredKeys,
      items: limitedItems,
    });
  } catch (error) {
    console.error("Failed to list kru database:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAnyRole(session.user.role, ["DATA", "DEVELOPER"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    await prisma.participantProfile.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete kru profile:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAnyRole(session.user.role, ["DATA", "DEVELOPER"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, biodata, displayName } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    if (
      biodata !== undefined &&
      (!biodata || typeof biodata !== "object" || Array.isArray(biodata))
    ) {
      return NextResponse.json(
        { error: "biodata must be an object" },
        { status: 400 },
      );
    }

    const catalogFields = await prisma.profileFieldCatalog.findMany({
      select: {
        key: true,
        fieldType: true,
      },
    });
    const phoneFieldKeySet = getPhoneFieldKeySet(catalogFields);

    const updated = await prisma.participantProfile.update({
      where: { id },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(biodata !== undefined && {
          biodata: normalizeBiodataPhones(biodata, {
            phoneFieldKeySet,
            includePhoneLikeKeys: true,
          }),
        }),
      },
    });

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("Failed to update kru profile:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
