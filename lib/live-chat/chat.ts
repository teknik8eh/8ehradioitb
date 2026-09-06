import type { GuestSession, ChatRoom, ChatMessage } from "@prisma/client";

export type { GuestSession, ChatRoom, ChatMessage };

/**
 * Payload yang dikirim lewat Pusher channel, bukan model DB langsung.
 * Dipisah dari model Prisma karena field yang dikirim ke client (frontend)
 * tidak selalu sama dengan kolom mentah di database (misal: tidak perlu kirim
 * field internal seperti ipAddress).
 */
export interface NewMessageEvent {
  id: string;
  roomId: string;
  sessionId: string;
  guestName: string;
  content: string;
  createdAt: string; // ISO string, Pusher payload harus JSON-serializable
}

export interface MessageDeletedEvent {
  id: string;
  roomId: string;
  deletedAt: string;
}

export interface GuestMutedEvent {
  sessionId: string;
  isMuted: boolean;
}

export interface RoomStatusEvent {
  roomId: string;
  isActive: boolean;
}

export interface LiveStatusEvent {
  isLive: boolean;
  roomId: string | null; // null kalau live-ended dan room sudah tidak ada
  liveChatEnabled?: boolean;
  songRequestEnabled?: boolean;
}
