import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import {
  buildCooldownMessage,
  getEmergencyPhoneCandidates,
  getMaskedEmergencyHintFromProfile,
  normalizeLast6Input,
  normalizeNim,
} from "@/lib/profile/claim";
import { reportCriticalError } from "@/lib/observability/critical";

const MAX_ATTEMPTS = 3;
const COOLDOWN_MINUTES = 15;
const CLAIM_ACTIONS = new Set(["lookup", "claim", "request_review"]);
const PROFILE_ALREADY_CLAIMED_ERROR = "profile_already_claimed";

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

async function findProfileByNim(nimInput) {
  const normalizedNim = normalizeNim(nimInput);
  if (!normalizedNim) return null;

  const profiles = await prisma.participantProfile.findMany({
    select: {
      id: true,
      userId: true,
      displayName: true,
      biodata: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  // Prisma's Mongo JSON filters do not support `path` on this client version,
  // so match NIM in memory after fetching the profile catalog.
  return profiles.find((profile) => normalizeNim(profile?.biodata?.nim) === normalizedNim) || null;
}

async function getActiveLock(requesterUserId) {
  const now = new Date();
  return prisma.profileClaimRequest.findFirst({
    where: {
      requesterUserId,
      status: "LOCKED",
      cooldownUntil: {
        gt: now,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      cooldownUntil: true,
    },
  });
}

async function createFailedAttempt({
  requesterUserId,
  requesterEmail,
  nimInput,
  emergencyLast4Input,
  targetProfileId,
  reason,
}) {
  const windowStart = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000);
  const failedInWindow = await prisma.profileClaimRequest.count({
    where: {
      requesterUserId,
      status: "FAILED",
      createdAt: {
        gte: windowStart,
      },
    },
  });

  const nextFailedAttempt = failedInWindow + 1;
  if (nextFailedAttempt >= MAX_ATTEMPTS) {
    const cooldownUntil = new Date(Date.now() + COOLDOWN_MINUTES * 60 * 1000);
    await prisma.profileClaimRequest.create({
      data: {
        requesterUserId,
        requesterEmail,
        targetProfileId,
        nimInput,
        emergencyLast4Input,
        status: "LOCKED",
        reason: reason || "too_many_attempts",
        cooldownUntil,
      },
    });
    return {
      locked: true,
      cooldownUntil,
      attemptsRemaining: 0,
    };
  }

  await prisma.profileClaimRequest.create({
    data: {
      requesterUserId,
      requesterEmail,
      targetProfileId,
      nimInput,
      emergencyLast4Input,
      status: "FAILED",
      reason: reason || "verification_failed",
    },
  });

  return {
    locked: false,
    attemptsRemaining: Math.max(0, MAX_ATTEMPTS - nextFailedAttempt),
  };
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "";

    if (!CLAIM_ACTIONS.has(action)) {
      return NextResponse.json(
        { error: "invalid_action" },
        { status: 400 },
      );
    }

    const requesterUserId = session.user.id;
    const requesterEmail = normalizeEmail(session.user.email);
    const nim = normalizeNim(body?.nim);
    if (!nim) {
      return NextResponse.json({ error: "nim_required" }, { status: 400 });
    }

    if (action === "claim") {
      const activeLock = await getActiveLock(requesterUserId);
      if (activeLock) {
        return NextResponse.json(
          {
            error: "cooldown_active",
            cooldownUntil: activeLock.cooldownUntil,
            message: buildCooldownMessage(activeLock.cooldownUntil),
          },
          { status: 429 },
        );
      }
    }

    const existingMine = await prisma.participantProfile.findUnique({
      where: { userId: requesterUserId },
      select: { id: true },
    });

    const targetProfile = await findProfileByNim(nim);
    if (!targetProfile) {
      if (action === "claim") {
        const failed = await createFailedAttempt({
          requesterUserId,
          requesterEmail,
          nimInput: nim,
          emergencyLast4Input: normalizeLast6Input(
            body?.emergencyLast6 ?? body?.emergencyLast4,
          ),
          targetProfileId: null,
          reason: "nim_not_found",
        });
        if (failed.locked) {
          return NextResponse.json(
            {
              error: "cooldown_active",
              cooldownUntil: failed.cooldownUntil,
              message: buildCooldownMessage(failed.cooldownUntil),
            },
            { status: 429 },
          );
        }
        return NextResponse.json(
          {
            error: "nim_not_found",
            attemptsRemaining: failed.attemptsRemaining,
          },
          { status: 404 },
        );
      }
      return NextResponse.json({ error: "nim_not_found" }, { status: 404 });
    }

    if (existingMine && existingMine.id !== targetProfile.id) {
      return NextResponse.json(
        { error: "already_has_profile" },
        { status: 409 },
      );
    }

    if (action === "lookup") {
      return NextResponse.json({
        ok: true,
        hint: getMaskedEmergencyHintFromProfile(targetProfile),
        alreadyLinked: targetProfile.userId === requesterUserId,
      });
    }

    if (action === "request_review") {
      const existingPending = await prisma.profileClaimRequest.findFirst({
        where: {
          requesterUserId,
          targetProfileId: targetProfile.id,
          status: "PENDING",
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (existingPending) {
        return NextResponse.json({
          ok: true,
          status: "PENDING",
          requestId: existingPending.id,
          message: "Request review sudah ada dan menunggu approval.",
        });
      }

      const created = await prisma.profileClaimRequest.create({
        data: {
          requesterUserId,
          requesterEmail,
          targetProfileId: targetProfile.id,
          nimInput: nim,
          emergencyLast4Input: null,
          status: "PENDING",
          reason: "manual_review_requested",
        },
        select: {
          id: true,
          status: true,
        },
      });

      return NextResponse.json({
        ok: true,
        ...created,
        message: "Request review berhasil dikirim.",
      });
    }

    const emergencyLast6 = normalizeLast6Input(
      body?.emergencyLast6 ?? body?.emergencyLast4,
    );
    if (emergencyLast6.length !== 6) {
      return NextResponse.json(
        { error: "emergency_last6_required" },
        { status: 400 },
      );
    }

    const emergencyCandidates = getEmergencyPhoneCandidates(targetProfile.biodata);
    const verified = emergencyCandidates.some((phone) =>
      phone.endsWith(emergencyLast6),
    );

    if (!verified) {
      const failed = await createFailedAttempt({
        requesterUserId,
        requesterEmail,
        nimInput: nim,
        emergencyLast4Input: emergencyLast6,
        targetProfileId: targetProfile.id,
        reason: "emergency_last6_mismatch",
      });
      if (failed.locked) {
        return NextResponse.json(
          {
            error: "cooldown_active",
            cooldownUntil: failed.cooldownUntil,
            message: buildCooldownMessage(failed.cooldownUntil),
          },
          { status: 429 },
        );
      }
      return NextResponse.json(
        {
          error: "verification_failed",
          attemptsRemaining: failed.attemptsRemaining,
        },
        { status: 400 },
      );
    }

    try {
      await prisma.$transaction(async (tx) => {
        const currentProfile = await tx.participantProfile.findUnique({
          where: { id: targetProfile.id },
          select: { userId: true },
        });

        if (!currentProfile) {
          throw new Error("profile_not_found");
        }

        if (currentProfile.userId && currentProfile.userId !== requesterUserId) {
          throw new Error(PROFILE_ALREADY_CLAIMED_ERROR);
        }

        if (currentProfile.userId !== requesterUserId) {
          await tx.participantProfile.update({
            where: {
              id: targetProfile.id,
            },
            data: {
              userId: requesterUserId,
            },
          });
        }

        if (requesterEmail) {
          await tx.whitelistedEmail.upsert({
            where: {
              email: requesterEmail,
            },
            update: {},
            create: {
              email: requesterEmail,
            },
          });
        }

        await tx.profileClaimRequest.create({
          data: {
            requesterUserId,
            requesterEmail,
            targetProfileId: targetProfile.id,
            nimInput: nim,
            emergencyLast4Input: emergencyLast6,
            status: "AUTO_APPROVED",
            reason: "nim_and_emergency_last6_verified",
            reviewedById: requesterUserId,
            reviewedAt: new Date(),
          },
        });
      });
    } catch (transactionError) {
      if (transactionError?.message === PROFILE_ALREADY_CLAIMED_ERROR) {
        return NextResponse.json(
          { error: PROFILE_ALREADY_CLAIMED_ERROR },
          { status: 409 },
        );
      }
      if (transactionError?.message === "profile_not_found") {
        return NextResponse.json({ error: "nim_not_found" }, { status: 404 });
      }
      throw transactionError;
    }

    return NextResponse.json({
      ok: true,
      status: "LINKED",
      message: "Profil berhasil dihubungkan ke akun Anda.",
    });
  } catch (error) {
    await reportCriticalError({
      source: "api/profile/claim",
      message: "Profile claim flow failed",
      error,
      context: {
        userId: session?.user?.id || "",
      },
    });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
