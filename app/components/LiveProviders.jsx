"use client";
import { LiveChatProvider } from "@/app/components/live-chat/LiveChatProvider";
import { SongRequestProvider } from "@/app/components/song-request/SongRequestProvider";

export default function LiveProviders({ children }) {
  return (
    <LiveChatProvider>
      <SongRequestProvider>{children}</SongRequestProvider>
    </LiveChatProvider>
  );
}
