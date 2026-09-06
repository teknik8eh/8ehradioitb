import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { hasRole } from "@/lib/roleUtils";

async function checkDeveloper(req) {
  const session = await getServerSession(authOptions);
  if (!session || !hasRole(session.user.role, "DEVELOPER")) {
    return { error: "Forbidden", status: 403 };
  }
  return { session };
}

// GET all whitelisted emails
export async function GET(req) {
  const { error, status } = await checkDeveloper(req);
  if (error) return NextResponse.json({ error }, { status });

  try {
    const whitelist = await prisma.whitelistedEmail.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(whitelist);
  } catch (err) {
    console.error("Error fetching whitelist:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// POST (add) new whitelisted emails in batch
export async function POST(req) {
  const { error, status } = await checkDeveloper(req);
  if (error) return NextResponse.json({ error }, { status });

  try {
    let { emails } = await req.json();

    // Accept either an array or a single string containing separators (\n,;, ,)
    if (typeof emails === "string") {
      emails = emails
        .split(/[\n,;]+/)
        .map(e => e.trim())
        .filter(e => e.length > 0);
    }

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid emails" },
        { status: 400 },
      );
    }

    // Normalize to lowercase and deduplicate within the batch
    const lowercasedEmails = Array.from(new Set(emails.map(e => e.toLowerCase())));

    // --- Check against existing records ---
    const existingEmails = (await prisma.whitelistedEmail.findMany({
      where: { email: { in: lowercasedEmails } },
      select: { email: true },
    })).map(e => e.email);

    const newEmails = lowercasedEmails.filter(email => !existingEmails.includes(email));

    if (newEmails.length === 0) {
      return NextResponse.json({ message: "All provided emails already exist in the whitelist or are duplicates.", count: 0 }, { status: 200 });
    }
    // --- END ---

    const result = await prisma.whitelistedEmail.createMany({
      data: newEmails.map(email => ({ email })),

    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("Error adding to whitelist:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// DELETE a whitelisted email
export async function DELETE(req) {
    const { error, status } = await checkDeveloper(req);
    if (error) return NextResponse.json({ error }, { status });

    try {
        const { id } = await req.json();

        if (!id) {
            return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        }

        await prisma.whitelistedEmail.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Email removed from whitelist" }, { status: 200 });
    } catch (err) {
        console.error("Error removing from whitelist:", err);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
} 