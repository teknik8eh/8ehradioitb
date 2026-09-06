import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/events/auth";
import { validationError } from "@/lib/events/contracts";
import { generateUniqueEventSlug } from "@/lib/forms/slug";
import { reportCriticalError } from "@/lib/observability/critical";

function toEventResponse(event) {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    description: event.description,
    status: event.status,
    createdById: event.createdById,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

function handleRouteError(error, context) {
  if (error?.status) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  if (error?.code === "P2002" && error?.meta?.target?.includes("slug")) {
    return NextResponse.json(
      { error: "Event slug must be unique" },
      { status: 409 },
    );
  }

  void reportCriticalError({
    source: "api/events",
    message: context,
    error,
  });
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}

export async function GET(req) {
  try {
    const session = await requireSession(req);
    const events = await prisma.event.findMany({
      where: {
        OR: [
          {
            createdById: session.user.id,
          },
          {
            organizers: {
              some: {
                userId: session.user.id,
                role: {
                  in: ["owner", "editor"],
                },
              },
            },
          },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(events.map(toEventResponse));
  } catch (error) {
    return handleRouteError(error, "Error listing events:");
  }
}

export async function POST(req) {
  try {
    const session =
      (await getServerSession(authOptions)) ?? (await requireSession(req));

    const body = await req.json();
    const requestedSlug =
      typeof body?.slug === "string" ? body.slug.trim() : "";
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const description =
      typeof body?.description === "string" ? body.description.trim() : null;

    if (!title) {
      return validationError(
        "Invalid payload",
        ["title is required and must be a non-empty string"],
        400,
      );
    }

    const slug = await generateUniqueEventSlug({
      title,
      requestedSlug,
      isTaken: async (candidate) => {
        const existing = await prisma.event.findUnique({
          where: { slug: candidate },
          select: { id: true },
        });
        return Boolean(existing);
      },
    });

    const event = await prisma.event.create({
      data: {
        slug,
        title,
        description,
        createdById: session.user.id,
        organizers: {
          create: {
            userId: session.user.id,
            role: "owner",
          },
        },
      },
    });

    return NextResponse.json(toEventResponse(event), { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Error creating event:");
  }
}
