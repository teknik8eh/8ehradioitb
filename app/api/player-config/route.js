import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { hasAnyRole } from "@/lib/roleUtils";

function isAdmin(roleString) {
  return hasAnyRole(roleString, ["DEVELOPER", "TECHNIC"]);
}

export async function GET() {
  const config = await prisma.playerConfig.findFirst();
  return NextResponse.json(config || {});
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { title, coverImage, addCoverImage } = await req.json();
  let config = await prisma.playerConfig.findFirst();
  // If addCoverImage is set, add to coverImages array (if not exists)
  if (addCoverImage) {
    if (config) {
      const exists = config.coverImages?.includes(addCoverImage);
      if (!exists) {
        config = await prisma.playerConfig.update({
          where: { id: config.id },
          data: { coverImages: { push: addCoverImage } },
        });
      }
    } else {
      config = await prisma.playerConfig.create({
        data: { title: title || "", coverImage: addCoverImage, coverImages: [addCoverImage] },
      });
    }
  }
  // Always allow updating title and coverImage (active)
  if (config) {
    config = await prisma.playerConfig.update({
      where: { id: config.id },
      data: { title, coverImage },
    });
  } else {
    config = await prisma.playerConfig.create({
      data: { title, coverImage, coverImages: coverImage ? [coverImage] : [] },
    });
  }
  return NextResponse.json(config);
}

export async function DELETE(req) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "No url provided" }, { status: 400 });
  let config = await prisma.playerConfig.findFirst();
  if (!config) return NextResponse.json({ error: "No config found" }, { status: 404 });
  // Don't allow removing default
  if (url === "/8eh.png") return NextResponse.json({ error: "Cannot remove default image" }, { status: 400 });
  const newImages = config.coverImages.filter((img) => img !== url);
  // If the active cover is being deleted, fallback to default
  let newCover = config.coverImage;
  if (config.coverImage === url) newCover = "/8eh.png";
  config = await prisma.playerConfig.update({
    where: { id: config.id },
    data: { coverImages: newImages, coverImage: newCover },
  });
  return NextResponse.json(config);
} 