export function serializeSongRequest(req) {
  return {
    id: req.id,
    sessionId: req.sessionId,
    guestName: req.guestName,
    songTitle: req.songTitle,
    songArtist: req.songArtist,
    songCoverUrl: req.songCoverUrl ?? null,
    itunesTrackId: req.itunesTrackId ?? null,
    message: req.message ?? null,
    status: req.status,
    rejectedReason: req.rejectedReason ?? null,
    broadcastId: req.broadcastId ?? null,
    createdAt: req.createdAt.toISOString(),
    updatedAt: req.updatedAt.toISOString(),
  };
}
