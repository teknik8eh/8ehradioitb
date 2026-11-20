import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { databaseUrlForName } from "@/lib/broadcast-db-url";

const sharedName = process.env.BROADCAST_SERVER_SHARED_DB_NAME?.trim() || "";
const currentName = sharedName
  ? decodeURIComponent(new URL(process.env.MONGODB_URL).pathname.slice(1))
  : "";

export const sharedBroadcastMode = Boolean(sharedName && sharedName !== currentName);

const globalForBroadcast = globalThis;
export const broadcastPrisma = sharedBroadcastMode
  ? (globalForBroadcast.broadcastPrisma || new PrismaClient({
      datasources: {
        db: { url: databaseUrlForName(process.env.MONGODB_URL, sharedName) },
      },
    }))
  : prisma;

if (sharedBroadcastMode && process.env.NODE_ENV !== "production") {
  globalForBroadcast.broadcastPrisma = broadcastPrisma;
}
