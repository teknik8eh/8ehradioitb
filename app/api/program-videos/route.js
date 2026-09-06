import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { hasAnyRole } from "@/lib/roleUtils";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET;

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});


function isAdmin(roleString) {
  return hasAnyRole(roleString, ["DEVELOPER", "TECHNIC"]);
}

export async function GET() {
  const videos = await prisma.programVideo.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(videos);
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await req.json();
  const { title, link, thumbnailKey } = data;
  if (!title || !link || !thumbnailKey) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const thumbnailUrl = `/api/proxy-audio?key=${thumbnailKey}`;
  const video = await prisma.programVideo.create({
    data: { 
        title, 
        link, 
        thumbnail: thumbnailUrl,
        thumbnailKey: thumbnailKey 
    },
  });
  return NextResponse.json(video, { status: 201 });
}

export async function DELETE(req) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const video = await prisma.programVideo.findUnique({ where: { id } });

  if (video && video.thumbnailKey) {
    await s3.send(
        new DeleteObjectCommand({
            Bucket: R2_BUCKET,
            Key: video.thumbnailKey,
        })
    );
  }

  await prisma.programVideo.delete({ where: { id } });
  return NextResponse.json({ success: true });
} 