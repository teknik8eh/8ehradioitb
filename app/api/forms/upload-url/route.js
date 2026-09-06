import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { isInternalAudience, normalizeFormSchema } from "@/lib/forms/schema";

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

function safeFileName(fileName) {
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
    const body = await req.json();
    const eventSlug =
      typeof body?.eventSlug === "string" ? body.eventSlug.trim() : "";
    const questionId =
      typeof body?.questionId === "string" ? body.questionId.trim() : "";
    const fileName =
      typeof body?.fileName === "string" ? body.fileName.trim() : "";
    const fileType =
      typeof body?.fileType === "string" ? body.fileType.trim() : "";
    const fileSize = Number(body?.fileSize || 0);

    if (!eventSlug || !questionId || !fileName || !fileType) {
      return NextResponse.json(
        { error: "eventSlug, questionId, fileName, fileType are required" },
        { status: 400 },
      );
    }

    const event = await prisma.event.findUnique({
      where: {
        slug: eventSlug,
      },
      select: {
        id: true,
      },
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
    if (isInternalAudience(schema) && !session?.user?.id) {
      return NextResponse.json({ error: "login_required" }, { status: 401 });
    }

    const question = schema.questions.find((item) => item.id === questionId);

    if (!question || question.fieldType !== "file_upload") {
      return NextResponse.json(
        { error: "file_upload_question_not_found" },
        { status: 404 },
      );
    }

    const allowedTypes = question.fileConfig.allowedMimeTypes || [];
    if (allowedTypes.length > 0 && !allowedTypes.includes(fileType)) {
      return NextResponse.json(
        {
          error: "invalid_file_type",
          details: [`Allowed types: ${allowedTypes.join(", ")}`],
        },
        { status: 400 },
      );
    }

    if (fileSize > 0) {
      const maxBytes = question.fileConfig.maxSizeMB * 1024 * 1024;
      if (fileSize > maxBytes) {
        return NextResponse.json(
          {
            error: "file_too_large",
            details: [`Max size: ${question.fileConfig.maxSizeMB} MB`],
          },
          { status: 400 },
        );
      }
    }

    const key = `forms/${eventSlug}/${questionId}/${Date.now()}_${safeFileName(fileName)}`;
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
    console.error("Error generating form upload URL:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 },
    );
  }
}
