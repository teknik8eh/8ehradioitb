
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { hasAnyRole } from "@/lib/roleUtils";

export async function GET(req) {
  const session = await getServerSession(authOptions);

  if (!session || !hasAnyRole(session.user.role, ["DEVELOPER", "REPORTER"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);

  if (!session || !hasAnyRole(session.user.role, ["DEVELOPER", "REPORTER"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { userId, role } = await req.json();

    if (!userId || !role) {
      return NextResponse.json(
        { error: "Missing userId or role" },
        { status: 400 },
      );
    }
    
    // No strict validation – allow combined roles like "DEVELOPER-TECHNIC"

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
} 