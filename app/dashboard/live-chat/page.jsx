"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { FiTrash2, FiVolumeX, FiVolume2, FiRefreshCw, FiMessageCircle } from "react-icons/fi";
import { hasAnyRole } from "@/lib/roleUtils";
import { useLiveChat } from "@/app/hooks/useLiveChat";

export default function LiveChatDashboardPage() {
  const { data: session, status } = useSession();
  const [roomId, setRoomId] = useState(null);
  const [isLive, setIsLive] = useState(null); // null = loading, false = not live, true = live

  const isAdmin =
    session && hasAnyRole(session.user.role, ["DEVELOPER", "TECHNIC"]);

  // Fetch active room
  useEffect(() => {
    if (!isAdmin) return;

    fetch("/api/live-chat/active-room")
      .then((res) => res.json())
      .then((data) => {
        setIsLive(data.live);
        if (data.live) {
          setRoomId(data.roomId);
        }
      })
      .catch((err) => {
        console.error("Gagal memverifikasi status siaran:", err);
        setIsLive(false);
      });
  }, [isAdmin]);

  const {
    messages,
    isConnected,
    activeListeners,
    activeGuests,
    deleteMessage,
    muteGuest
  } = useLiveChat(roomId);

  const handleDeleteMessage = useCallback(async (messageId) => {
    await deleteMessage(messageId);
  }, [deleteMessage]);

  const handleMute = useCallback(async (guestSessionId, guestName) => {
    if (!confirm(`Mute "${guestName}"? User ini tidak akan bisa mengirim pesan.`)) return;
    await muteGuest(guestSessionId, "mute");
  }, [muteGuest]);

  const handleUnmute = useCallback(async (guestSessionId) => {
    await muteGuest(guestSessionId, "unmute");
  }, [muteGuest]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  if (status === "loading" || (isAdmin && isLive === null)) {
    return <div className="p-8 text-center font-plus-jakarta-sans">Loading...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center font-plus-jakarta-sans text-[#D83232]">
        Access Denied.
      </div>
    );
  }

  if (!isLive) {
    return (
      <div className="max-w-6xl mx-auto p-8 text-center bg-white rounded-xl shadow-md border border-gray-200">
        <span className="text-4xl mb-3 block">📡</span>
        <h2 className="text-lg font-bold text-gray-800 mb-1">Siaran Belum Aktif</h2>
        <p className="text-sm text-gray-500 font-plus-jakarta-sans">
          Tidak ada room chat aktif saat ini. Aktifkan siaran melalui panel kontrol siaran.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-plus-jakarta-sans font-bold text-gray-800">
          Live Chat
        </h1>
        <p className="text-gray-600 font-plus-jakarta-sans mt-1">
          Monitor dan moderasi pesan live chat secara real-time.
        </p>
      </div>

      {/* Status Bar */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-plus-jakarta-sans font-medium ${
            isConnected
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-[#D83232]/10 text-[#B72929] border border-[#D83232]/20"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isConnected ? "bg-green-500 animate-pulse" : "bg-[#D83232]"
            }`}
          />
          {isConnected ? "Terhubung" : "Terputus"}
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-plus-jakarta-sans font-medium bg-blue-50 text-blue-700 border border-blue-200"
          title={`${activeListeners} peserta sesi`}
          aria-label={`${activeListeners} peserta sesi`}
        >
          <FiMessageCircle size={14} />
          {activeListeners}
        </div>
        <div className="text-sm font-plus-jakarta-sans text-gray-500">
          {messages.filter((m) => !m.deleted).length} pesan
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages Panel */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-gray-200 flex flex-col" style={{ maxHeight: "600px" }}>
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-plus-jakarta-sans font-semibold text-gray-800">
              Pesan Masuk
            </h2>
            <span className="text-xs text-gray-400 font-plus-jakarta-sans">Real-time</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10 font-plus-jakarta-sans">
                Belum ada pesan masuk.
              </p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    msg.deleted
                      ? "bg-gray-50 border-gray-100 opacity-60"
                      : "bg-white border-gray-100 hover:bg-gray-50"
                  } transition-colors group`}
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-[#D83232]/10 text-[#B72929] flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {msg.senderName?.charAt(0).toUpperCase()}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-gray-800 font-plus-jakarta-sans">
                        {msg.senderName}
                      </span>
                      <span className="text-[10px] text-gray-400 font-plus-jakarta-sans">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    {msg.deleted ? (
                      <p className="text-sm text-gray-400 italic font-plus-jakarta-sans">
                        Pesan ini dihapus oleh moderator
                      </p>
                    ) : (
                      <p className="text-sm text-gray-700 font-plus-jakarta-sans break-words">
                        {msg.text}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {!msg.deleted && (
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-[#D83232] transition-all rounded-md hover:bg-[#D83232]/10"
                      title="Hapus pesan"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Guests Panel */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col" style={{ maxHeight: "600px" }}>
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-plus-jakarta-sans font-semibold text-gray-800">
              Tamu Aktif
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {activeGuests.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10 font-plus-jakarta-sans">
                Belum ada tamu aktif.
              </p>
            ) : (
              activeGuests.map((guest, idx) => {
                const isMuted = guest.isMuted;
                return (
                  <div
                    key={`${guest.sessionId}-${idx}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800 font-plus-jakarta-sans truncate">
                        {guest.name}
                      </p>
                      <p
                        className="text-[10px] text-gray-400 font-plus-jakarta-sans truncate"
                        title={guest.sessionId}
                      >
                        {guest.sessionId.slice(0, 12)}...
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        isMuted
                          ? handleUnmute(guest.sessionId)
                          : handleMute(guest.sessionId, guest.name)
                      }
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        isMuted
                          ? "bg-green-50 text-green-600 hover:bg-green-100 border border-green-200"
                          : "bg-[#D83232]/10 text-[#D83232] hover:bg-[#D83232]/15 border border-[#D83232]/20"
                      }`}
                      title={isMuted ? "Unmute user" : "Mute user"}
                    >
                      {isMuted ? (
                        <>
                          <FiVolume2 size={12} /> Unmute
                        </>
                      ) : (
                        <>
                          <FiVolumeX size={12} /> Mute
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

