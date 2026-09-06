"use client";
import { useState, useRef, useEffect } from "react";
import { FiX, FiUsers, FiSend } from "react-icons/fi";
import { useLiveChat } from "@/app/hooks/useLiveChat";
import ChatMessage from "./ChatMessage";

const MAX_MESSAGE_LENGTH = 300;

/**
 * Panel chat yang muncul sebagai overlay di atas bar player bawah.
 *
 * @param {{
 *   session: { roomId: string, sessionId: string, guestName: string },
 *   onClose: () => void,
 * }}
 */
export default function LiveChatPanel({ session, onClose }) {
  const {
    messages,
    activeListeners,
    isConnected,
    connectionError,
    sendMessage,
  } = useLiveChat(session?.roomId ?? null, Boolean(session?.guestName));
  const [input, setInput] = useState("");
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);
  const listEndRef = useRef(null);
  const listRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll ke bawah saat pesan baru, kecuali user sedang scroll ke atas
  useEffect(() => {
    if (autoScroll && listEndRef.current) {
      listEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScroll]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAutoScroll(nearBottom);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;
    setFormError("");
    setSending(true);
    const result = await sendMessage(input, session?.guestName);
    setSending(false);
    if (result.ok) {
      setInput("");
    } else if (result.error) {
      setFormError(result.error);
    }
  };

  return (
    <div className="fixed bottom-24 right-4 md:right-6 z-[55] w-[calc(100vw-2rem)] sm:w-96 h-[60vh] max-h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden origin-bottom-right">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#D83232] text-white">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          <span className="font-heading font-semibold truncate">
            Live Chat
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="flex items-center gap-1 text-xs bg-white/20 px-2 py-1 rounded-full">
            <FiUsers size={12} />
            {activeListeners}
          </span>
          <button
            onClick={onClose}
            className="hover:bg-white/20 rounded-full p-1 cursor-pointer"
            aria-label="Tutup chat"
          >
            <FiX size={18} />
          </button>
        </div>
      </div>

      {/* Connection status */}
      <div className="px-4 py-1 text-[10px] text-gray-400 bg-gray-50 border-b border-gray-100 font-body">
        {isConnected
          ? "Terhubung · realtime"
          : "Menghubungkan ke realtime..."}
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 bg-gray-50"
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center text-gray-400 text-sm font-body px-6">
            Belum ada pesan. Jadilah yang pertama menyapa penyiar!
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              msg={msg}
              isOwn={msg.sessionId === session.guestSessionId}
            />
          ))
        )}
        <div ref={listEndRef} />
      </div>

      {/* Error banner (mute / rate limit / koneksi) */}
      {(connectionError || formError) && (
        <div className="mx-3 mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-body">
          {formError || "Koneksi realtime bermasalah. Pesan tetap akan dicoba dimuat ulang."}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-gray-200 bg-white flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          maxLength={MAX_MESSAGE_LENGTH}
          onChange={(e) => {
            setInput(e.target.value);
            setFormError("");
          }}
          placeholder="Tulis pesan..."
          className="flex-1 px-4 py-2 border border-gray-200 rounded-full text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#D83232] font-body"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="w-9 h-9 flex-shrink-0 rounded-full bg-[#D83232] hover:bg-[#B72929] text-white flex items-center justify-center disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
          aria-label="Kirim pesan"
        >
          <FiSend size={16} />
        </button>
      </form>
    </div>
  );
}
