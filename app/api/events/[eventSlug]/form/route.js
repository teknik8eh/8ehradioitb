import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { resolveParticipantEventForm } from "@/lib/events/formRead";

export async function GET(req, { params }) {
  void req;

  try {
    const session = await getServerSession(authOptions);
    const { eventSlug } = await params;
    const result = await resolveParticipantEventForm(eventSlug, {
      userId: session?.user?.id ?? null,
      role: session?.user?.role ?? null,
      email: session?.user?.email ?? null,
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("Failed to read participant event form:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 },
    );
  }
}
