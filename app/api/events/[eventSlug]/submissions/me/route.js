import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import {
  isSingleResponsePolicy,
  findExistingSubmissionByIdentity,
} from "@/lib/forms/submission";
import { normalizeFormSchema } from "@/lib/forms/schema";

export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const event = await prisma.event.findUnique({
      where: { slug: params.eventSlug },
      select: { id: true },
    });

    if (!event) {
      return NextResponse.json({ error: "event_not_found" }, { status: 404 });
    }

    const formVersion = await prisma.eventFormVersion.findFirst({
      where: {
        eventId: event.id,
        status: "published",
      },
      orderBy: {
        version: "desc",
      },
      select: {
        formSchema: true,
      },
    });

    if (!formVersion) {
      return NextResponse.json({ error: "no_published_form" }, { status: 404 });
    }

    const schema = normalizeFormSchema(formVersion.formSchema);
    if (!isSingleResponsePolicy(schema.settings.responsePolicy)) {
      return NextResponse.json({ item: null });
    }

    const identity = {
      userId: session.user.id,
      email:
        typeof session.user.email === "string" && session.user.email.trim()
          ? session.user.email.trim().toLowerCase()
          : null,
    };

    const submission = await findExistingSubmissionByIdentity(event.id, identity);

    if (!submission) {
      return NextResponse.json({ item: null });
    }

    return NextResponse.json({
      item: {
        id: submission.id,
        answers: submission.answers,
        submittedAt: submission.submittedAt,
        updatedAt: submission.updatedAt,
      },
    });
  } catch (error) {
    console.error("Failed to read own submission:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 },
    );
  }
}
