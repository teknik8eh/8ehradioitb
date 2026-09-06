"use client";
import { useState, useEffect } from "react";
import { formatRelative, formatAbsolute } from "./relativeTime";

/**
 * Satu bubble pesan chat.
 * @param {{ msg: object, isOwn: boolean }}
 *
 * msg: { id, sessionId, guestName, content, isDeleted, createdAt, deletedAt }
 */
export default function ChatMessage({ msg, isOwn }) {
  const [, force] = useState(0);

  // Refresh label relatif setiap 30 detik
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  if (msg.isDeleted) {
    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2`}>
        <div className="max-w-[80%] px-4 py-2 rounded-2xl bg-gray-100 text-gray-400 italic text-xs">
          Pesan ini dihapus oleh moderator
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`max-w-[80%] px-4 py-2 rounded-2xl ${
          isOwn
            ? "bg-[#D83232] text-white rounded-br-md"
            : "bg-white shadow-sm text-gray-800 rounded-bl-md border border-gray-100"
        }`}
      >
        {!isOwn && (
          <div className="text-xs font-semibold mb-0.5 text-[#D83232]">
            {msg.guestName}
          </div>
        )}
        <div className="text-sm break-words whitespace-pre-wrap">
          {msg.content}
        </div>
        <div
          className={`text-[10px] mt-1 text-right ${
            isOwn ? "text-white/70" : "text-gray-400"
          }`}
          title={formatAbsolute(msg.createdAt)}
        >
          {formatRelative(msg.createdAt)}
        </div>
      </div>
    </div>
  );
}
