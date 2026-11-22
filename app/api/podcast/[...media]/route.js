// File: app/api/podcast/[...media]/route.js

import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

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

export async function GET(req, { params }) {
  // Menggabungkan segmen path menjadi satu key untuk R2
  // Contoh: /api/podcast/podcasts/audio.mp3 -> 'podcasts/audio.mp3'
  const media = params.media;
  const key = media.join('/');

  if (!key) {
    return NextResponse.json({ error: "File key is missing" }, { status: 400 });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    });
    const s3Response = await s3.send(command);

    // Pastikan Body adalah stream yang bisa dibaca
    if (!s3Response.Body || typeof s3Response.Body.transformToWebStream !== 'function') {
        throw new Error("S3 response body is not a readable stream.");
    }
    
    // Gunakan transformToWebStream untuk mengubah S3 Body menjadi Web Stream
    const body = s3Response.Body.transformToWebStream();

    // Siapkan headers untuk respons
    const headers = new Headers();
    headers.set("Content-Type", s3Response.ContentType || "application/octet-stream");
    headers.set("Content-Length", s3Response.ContentLength?.toString() || '0');
    // no-store: mencegah cache poisoning di CDN edge
    headers.set("Cache-Control", "private, no-store");
    headers.set("Accept-Ranges", "bytes");

    return new NextResponse(body, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error(`Error fetching from R2 for key ${key}:`, error);
    if (error.name === 'NoSuchKey') {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}