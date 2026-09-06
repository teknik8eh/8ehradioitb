import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET;

const s3 =
  R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET
    ? new S3Client({
        region: "auto",
        endpoint: R2_ENDPOINT,
        credentials: {
          accessKeyId: R2_ACCESS_KEY_ID,
          secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
      })
    : null;

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req) {
  try {
    if (!s3 || !R2_BUCKET) {
      return NextResponse.json(
        { error: "storage_not_configured" },
        { status: 503 },
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : "";
    const fileType = typeof body?.fileType === "string" ? body.fileType.trim() : "";
    const fieldKey = typeof body?.fieldKey === "string" ? body.fieldKey.trim() : "profile";

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: "fileName and fileType are required" },
        { status: 400 },
      );
    }

    const safeName = sanitizeFileName(fileName);
    const safeFieldKey = fieldKey.replace(/[^a-zA-Z0-9_-]/g, "_");
    
    // Allow admins to upload for other users
    let targetUserId = session.user.id;
    const isAdmin = ["DEVELOPER", "DATA"].includes(session.user.role);
    if (isAdmin && typeof body?.targetUserId === "string" && body.targetUserId.trim()) {
      targetUserId = body.targetUserId.trim();
    }

    const key = `kru-profile/${targetUserId}/${safeFieldKey}/${Date.now()}_${safeName}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 1800 });

    return NextResponse.json({
      uploadUrl,
      key,
    });
  } catch (error) {
    console.error("Failed to generate profile upload URL:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 },
    );
  }
}
