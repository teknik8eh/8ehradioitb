import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { hasAnyRole } from "@/lib/roleUtils";

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_PUBLIC_DEV_URL = process.env.R2_PUBLIC_DEV_URL;

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

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { fileName, fileType } = await req.json();
    if (!fileName || !fileType) {
      return NextResponse.json({ error: "Missing fileName or fileType" }, { status: 400 });
    }
    const key = `player-covers/${Date.now()}_${fileName}`;
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: fileType,
      ACL: "public-read",
    });
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    const url = `${R2_PUBLIC_DEV_URL}/${key}`;
    return NextResponse.json({ uploadUrl, key, url });
  } catch (error) {
    console.error("Error generating pre-signed URL:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 