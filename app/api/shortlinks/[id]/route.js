import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

// GET - Fetch a specific short link
export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = params;

    const shortLink = await prisma.shortLink.findFirst({
      where: {
        id,
        userId: session.user.id
      },
      include: {
        _count: {
          select: {
            clicks: true
          }
        }
      }
    });

    if (!shortLink) {
      return NextResponse.json(
        { error: "Short link not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(shortLink);
  } catch (error) {
    console.error("Error fetching short link:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a short link
export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Check if the short link belongs to the user
    const shortLink = await prisma.shortLink.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    });

    if (!shortLink) {
      return NextResponse.json(
        { error: "Short link not found" },
        { status: 404 }
      );
    }

    // Delete the short link (cascade will delete clicks too)
    await prisma.shortLink.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Short link deleted successfully" });
  } catch (error) {
    console.error("Error deleting short link:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
} 