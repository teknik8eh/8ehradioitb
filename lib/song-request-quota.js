import { prisma } from '@/lib/prisma';

// Source of truth: requests that were successfully created for this guest and broadcast.
export function getSongRequestCount(guestSessionId, broadcastId) {
  if (!broadcastId) return Promise.resolve(0);
  return prisma.songRequest.count({
    where: { sessionId: guestSessionId, broadcastId },
  });
}
