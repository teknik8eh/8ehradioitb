"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useOnAirStatus } from "@/app/hooks/useOnAirStatus";
import GuestNameModal from "./GuestNameModal";
import LiveChatPanel from "./LiveChatPanel";

const LiveChatContext = createContext(null);

/**
 * Cek apakah guest session masih valid di server.
 * Return { session, broadcastId, roomId } | null
 */
async function fetchSessionStatus() {
  try {
    const res = await fetch("/api/live-chat/guest-session-status");
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.active) return null;
    return data;
  } catch {
    return null;
  }
}

export function LiveChatProvider({ children }) {
  const { isOnAir } = useOnAirStatus();
  const [session, setSession] = useState(null); // { sessionId, guestName, roomId, broadcastId }
  const [showNameModal, setShowNameModal] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [checkedSession, setCheckedSession] = useState(false);

  // ── Saat onAir berubah, cek apakah guest sudah punya session valid ──
  useEffect(() => {
    if (!isOnAir) {
      // Saat offline, tutup panel & reset session (session DB sudah di-expire server-side)
      setPanelOpen(false);
      setSession(null);
      setCheckedSession(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const status = await fetchSessionStatus();
      if (!cancelled) {
        setSession(status ? status.session : null);
        setCheckedSession(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOnAir]);

  // ── Buka chat (dipanggil dari tombol di bar player) ──
  const openChat = useCallback(() => {
    if (!isOnAir) return;
    if (session) {
      setPanelOpen(true);
    } else {
      setShowNameModal(true);
    }
  }, [isOnAir, session]);

  // Listen window event agar tombol di GlobalAudioPlayer bisa trigger
  useEffect(() => {
    const handler = () => openChat();
    window.addEventListener("liveChat:open", handler);
    return () => window.removeEventListener("liveChat:open", handler);
  }, [openChat]);

  // ── Submit nama panggilan ──
  const handleNameSubmit = useCallback(
    async (guestName) => {
      const res = await fetch("/api/live-chat/guest-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Gagal masuk ke chat.");
      }
      setSession({
        sessionId: data.sessionId,
        guestSessionId: data.guestSessionId,
        guestName: data.guestName,
        roomId: data.roomId,
        broadcastId: data.broadcastId,
      });
      setShowNameModal(false);
      setPanelOpen(true);
    },
    [],
  );

  return (
    <LiveChatContext.Provider
      value={{ isOnAir, session, openChat, panelOpen, setPanelOpen }}
    >
      {children}
      {isOnAir && (
        <>
          <GuestNameModal
            isOpen={showNameModal}
            onClose={() => setShowNameModal(false)}
            onSubmit={handleNameSubmit}
          />
          {panelOpen && session && (
            <LiveChatPanel
              session={session}
              onClose={() => setPanelOpen(false)}
            />
          )}
        </>
      )}
    </LiveChatContext.Provider>
  );
}

export function useLiveChatContext() {
  return useContext(LiveChatContext);
}
