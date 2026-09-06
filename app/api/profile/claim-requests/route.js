import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { hasAnyRole } from "@/lib/roleUtils";
import { normalizeNim } from "@/lib/profile/claim";

function canReviewClaims(role) {
  return hasAnyRole(role, ["DATA", "DEVELOPER"]);
}

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canReviewClaims(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = (searchParams.get("status") || "PENDING").trim().toUpperCase();
    const limitRaw = Number(searchParams.get("limit") || "100");
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0
        ? Math.min(Math.floor(limitRaw), 500)
        : 100;

    const where = status ? { status } : {};
    const items = await prisma.profileClaimRequest.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      include: {
        requesterUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        targetProfile: {
          select: {
            id: true,
            userId: true,
            displayName: true,
            biodata: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      items: items.map((item) => {
        const biodata =
          item.targetProfile?.biodata &&
          typeof item.targetProfile.biodata === "object" &&
          !Array.isArray(item.targetProfile.biodata)
            ? item.targetProfile.biodata
            : {};
        return {
          id: item.id,
          status: item.status,
          reason: item.reason,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          reviewedAt: item.reviewedAt,
          nimInput: normalizeNim(item.nimInput),
          requesterEmail: item.requesterEmail,
          requesterUser: item.requesterUser,
          reviewedBy: item.reviewedBy,
          targetProfile: item.targetProfile
            ? {
                id: item.targetProfile.id,
                userId: item.targetProfile.userId,
                displayName:
                  item.targetProfile.displayName ||
                  (typeof biodata.fullName === "string" ? biodata.fullName : "") ||
                  null,
                nim:
                  typeof biodata.nim === "string" || typeof biodata.nim === "number"
                    ? String(biodata.nim)
                    : "",
                ownerUser: item.targetProfile.user,
              }
            : null,
        };
      }),
    });
  } catch (error) {
    console.error("Failed to fetch profile claim requests:", error);
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

  if (!canReviewClaims(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const id = typeof body?.id === "string" ? body.id : "";
    const action = typeof body?.action === "string" ? body.action : "";
    const reviewNote = typeof body?.reviewNote === "string" ? body.reviewNote.trim() : "";

    if (!id || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "invalid_payload" },
        { status: 400 },
      );
    }

    const requestRecord = await prisma.profileClaimRequest.findUnique({
      where: { id },
      include: {
        targetProfile: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!requestRecord) {
      return NextResponse.json({ error: "request_not_found" }, { status: 404 });
    }

    if (requestRecord.status !== "PENDING") {
      return NextResponse.json(
        { error: "request_not_pending" },
        { status: 409 },
      );
    }

    if (action === "reject") {
      const rejected = await prisma.profileClaimRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          reason: reviewNote || "rejected_by_reviewer",
          reviewedById: session.user.id,
          reviewedAt: new Date(),
        },
      });
      return NextResponse.json({ ok: true, request: rejected });
    }

    if (!requestRecord.targetProfileId || !requestRecord.targetProfile) {
      return NextResponse.json(
        { error: "target_profile_missing" },
        { status: 400 },
      );
    }

    const requesterExistingProfile = await prisma.participantProfile.findUnique({
      where: { userId: requestRecord.requesterUserId },
      select: { id: true },
    });

    if (
      requesterExistingProfile &&
      requesterExistingProfile.id !== requestRecord.targetProfileId
    ) {
      return NextResponse.json(
        { error: "requester_already_has_profile" },
        { status: 409 },
      );
    }

    const now = new Date();
    const approved = await prisma.$transaction(async (tx) => {
      if (requestRecord.targetProfile.userId !== requestRecord.requesterUserId) {
        await tx.participantProfile.update({
          where: {
            id: requestRecord.targetProfileId,
          },
          data: {
            userId: requestRecord.requesterUserId,
          },
        });
      }

      if (requestRecord.requesterEmail) {
        await tx.whitelistedEmail.upsert({
          where: {
            email: requestRecord.requesterEmail,
          },
          update: {},
          create: {
            email: requestRecord.requesterEmail,
          },
        });
      }

      return tx.profileClaimRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          reason: reviewNote || requestRecord.reason || "approved_by_reviewer",
          reviewedById: session.user.id,
          reviewedAt: now,
        },
      });
    });

    return NextResponse.json({ ok: true, request: approved });
  } catch (error) {
    console.error("Failed to update profile claim request:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
