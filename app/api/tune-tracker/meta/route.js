import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { hasAnyRole } from "@/lib/roleUtils";

function isMusic(roleString) {
  return hasAnyRole(roleString, ["MUSIC", "DEVELOPER"]);
}

export async function GET() {
  try {
    const meta = await prisma.tuneTrackerMeta.findFirst();
    return NextResponse.json(meta);
  } catch (error) {
    console.error("Failed to fetch tune tracker meta:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 },
    );
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isMusic(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { curatedBy, editionDate } = await req.json();

    if (editionDate !== undefined) {
      const parsedDate = new Date(editionDate);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid editionDate format" },
          { status: 400 },
        );
      }
    }

    let meta = await prisma.tuneTrackerMeta.findFirst();

    const data = {};
    if (curatedBy !== undefined) data.curatedBy = curatedBy;
    if (editionDate !== undefined) data.editionDate = new Date(editionDate);

    if (meta) {
      meta = await prisma.tuneTrackerMeta.update({
        where: { id: meta.id },
        data,
      });
    } else {
      try {
        meta = await prisma.tuneTrackerMeta.create({
          data: {
            curatedBy: curatedBy || "",
            editionDate: editionDate ? new Date(editionDate) : new Date(),
          },
        });
      } catch {
        // Race: another request created the record first — retry as update
        meta = await prisma.tuneTrackerMeta.findFirst();
        if (meta) {
          meta = await prisma.tuneTrackerMeta.update({
            where: { id: meta.id },
            data,
          });
        }
      }
    }

    return NextResponse.json(meta);
  } catch (error) {
    console.error("Failed to upsert tune tracker meta:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 },
    );
  }
}
