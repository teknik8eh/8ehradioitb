import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";

export const EVENT_ACTIONS = {
  FORM_EDIT: "form_edit",
  SUBMISSION_READ: "submission_read",
  EXPORT_RUN: "export_run",
  REGISTRATION_SUBMIT: "registration_submit",
  COLLABORATOR_READ: "collaborator_read",
  COLLABORATOR_MANAGE: "collaborator_manage",
  EVENT_DELETE: "event_delete",
};

const ORGANIZER_SCOPED_ACTIONS = new Set([
  EVENT_ACTIONS.FORM_EDIT,
  EVENT_ACTIONS.SUBMISSION_READ,
  EVENT_ACTIONS.EXPORT_RUN,
  EVENT_ACTIONS.COLLABORATOR_READ,
  EVENT_ACTIONS.COLLABORATOR_MANAGE,
  EVENT_ACTIONS.EVENT_DELETE,
]);

const ORGANIZER_ROLES = {
  OWNER: "owner",
  EDITOR: "editor",
};

const ACTION_ROLE_ALLOWLIST = {
  [EVENT_ACTIONS.FORM_EDIT]: new Set([ORGANIZER_ROLES.OWNER, ORGANIZER_ROLES.EDITOR]),
  [EVENT_ACTIONS.SUBMISSION_READ]: new Set([
    ORGANIZER_ROLES.OWNER,
    ORGANIZER_ROLES.EDITOR,
  ]),
  [EVENT_ACTIONS.EXPORT_RUN]: new Set([ORGANIZER_ROLES.OWNER, ORGANIZER_ROLES.EDITOR]),
  [EVENT_ACTIONS.COLLABORATOR_READ]: new Set([
    ORGANIZER_ROLES.OWNER,
    ORGANIZER_ROLES.EDITOR,
  ]),
  [EVENT_ACTIONS.COLLABORATOR_MANAGE]: new Set([ORGANIZER_ROLES.OWNER]),
  [EVENT_ACTIONS.EVENT_DELETE]: new Set([ORGANIZER_ROLES.OWNER]),
};

export async function requireSession(req) {
  void req;
  const session = await getServerSession(authOptions);

  if (!session) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }

  return session;
}

export async function getSessionUser(req) {
  void req;
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

function normalizeOrganizerRole(role) {
  if (typeof role !== "string" || !role.trim()) {
    return null;
  }

  const normalized = role.trim().toLowerCase();
  if (
    normalized === ORGANIZER_ROLES.OWNER ||
    normalized === ORGANIZER_ROLES.EDITOR
  ) {
    return normalized;
  }
  return null;
}

export async function canPerformEventAction(userId, eventId, action) {
  if (action === EVENT_ACTIONS.REGISTRATION_SUBMIT) {
    if (!userId) {
      return { allowed: false, reason: "authentication_required" };
    }
    return { allowed: true, reason: "allowed" };
  }

  if (!ORGANIZER_SCOPED_ACTIONS.has(action)) {
    return { allowed: false, reason: "unknown_action" };
  }

  if (!userId) {
    return { allowed: false, reason: "authentication_required" };
  }

  if (!eventId) {
    return { allowed: false, reason: "missing_event_id" };
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        createdById: true,
        organizers: {
          where: {
            userId,
          },
          select: {
            role: true,
          },
          take: 1,
        },
      },
    });

    if (!event?.createdById) {
      return { allowed: false, reason: "event_not_found" };
    }

    const actorRole =
      event.createdById === userId
        ? ORGANIZER_ROLES.OWNER
        : normalizeOrganizerRole(event.organizers?.[0]?.role);

    if (event.createdById !== userId && event.organizers.length === 0) {
      return { allowed: false, reason: "not_collaborator" };
    }

    const allowlist = ACTION_ROLE_ALLOWLIST[action];
    if (!allowlist) {
      return { allowed: false, reason: "unknown_action_policy" };
    }

    if (allowlist.has(actorRole)) {
      return { allowed: true, reason: `allowed_${actorRole}` };
    }

    return {
      allowed: false,
      reason: `insufficient_role_${actorRole || "unknown"}`,
    };
  } catch (error) {
    console.error("Error evaluating event action authorization:", error);
    return { allowed: false, reason: "db_unavailable" };
  }
}

export async function assertEventOwner(userId, eventId) {
  return assertEventAction(userId, eventId, EVENT_ACTIONS.COLLABORATOR_MANAGE);
}

export async function assertEventAction(userId, eventId, action) {
  const result = await canPerformEventAction(userId, eventId, action);

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Forbidden", reason: result.reason },
      { status: 403 },
    );
  }

  return null;
}
