"use client";
import { createContext, useState, useEffect, useCallback, useRef } from "react";
import { useOnAirStatus } from "@/app/hooks/useOnAirStatus";
import { getPusherClient } from "@/app/hooks/usePusherClient";
import { useLiveChatContext } from "@/app/components/live-chat/LiveChatProvider";
import SongRequestModal from "./SongRequestModal";
import SongRequestPanel from "./SongRequestPanel";
import GuestNameModal from "@/app/components/live-chat/GuestNameModal";

export const SongRequestContext = createContext(null);

const REQUEST_LIMIT = parseInt(process.env.NEXT_PUBLIC_SONG_REQUEST_LIMIT || "3", 10) || 3;

export function SongRequestProvider({ children }) {
  const { isOnAir } = useOnAirStatus();
  const liveChat = useLiveChatContext();
  const session = liveChat?.session;

  const [queue, setQueue] = useState([]);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [broadcastId, setBroadcastId] = useState(null);
  const [requestCount, setRequestCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const channelRef = useRef(null);

  const remaining = Math.max(0, REQUEST_LIMIT - requestCount);

  // Fetch broadcastId from stream-config
  useEffect(() => {
    if (!isOnAir) {
      setBroadcastId(null);
      setQueue([]);
      setNowPlaying(null);
      setModalOpen(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/stream-config");
        if (res.ok) {
          const data = await res.json();
          setBroadcastId(data.broadcastId || null);
        }
      } catch { /* noop */ }
    })();
  }, [isOnAir]);

  // Sync requestCount from session status
  useEffect(() => {
    if (!isOnAir) return;
    (async () => {
      try {
        const res = await fetch("/api/live-chat/guest-session-status");
        if (res.ok) {
          const data = await res.json();
          if (data.active) {
            setRequestCount(data.session.requestCount || 0);
          }
        }
      } catch { /* noop */ }
    })();
  }, [isOnAir]);

  // Fetch queue
  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/song-request/queue");
      if (res.ok) {
        const data = await res.json();
        setQueue(data.queue || []);
        setNowPlaying(data.nowPlaying || null);
      }
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    if (isOnAir && broadcastId) {
      fetchQueue();
    }
  }, [isOnAir, broadcastId, fetchQueue]);

  // Pusher subscription for queue updates
  useEffect(() => {
    if (!broadcastId) return;

    const pusher = getPusherClient();
    if (!pusher) {
      const timer = setInterval(fetchQueue, 15_000);
      return () => clearInterval(timer);
    }

    const channel = pusher.subscribe(`broadcast-${broadcastId}`);
    channelRef.current = channel;

    channel.bind("queue-updated", () => {
      fetchQueue();
    });

    channel.bind("song-request-new", () => {
      fetchQueue();
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`broadcast-${broadcastId}`);
      channelRef.current = null;
    };
  }, [broadcastId, fetchQueue]);

  // Submit song request
  const submit = useCallback(
    async (data) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const res = await fetch("/api/song-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await res.json().catch(() => ({}));

        if (!res.ok) {
          const errMsg = result.error || "Gagal mengirim request.";
          setError(errMsg);
          throw new Error(errMsg);
        }

        setRequestCount((prev) => prev + 1);
        fetchQueue();
        return result;
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchQueue],
  );

  // Open song request — check if session exists first
  const openSongRequest = useCallback(() => {
    if (!isOnAir) return;
    if (session) {
      setModalOpen(true);
    } else {
      setShowNameModal(true);
    }
  }, [isOnAir, session]);

  // Listen for window event to open song request modal
  useEffect(() => {
    const handler = () => openSongRequest();
    window.addEventListener("songRequest:open", handler);
    return () => window.removeEventListener("songRequest:open", handler);
  }, [openSongRequest]);

  // Listen for window event to open queue panel
  useEffect(() => {
    const handler = () => {
      if (isOnAir) setPanelOpen(true);
    };
    window.addEventListener("songRequestQueue:open", handler);
    return () => window.removeEventListener("songRequestQueue:open", handler);
  }, [isOnAir]);

  // After guest name submit, open song request modal
  const handleNameSubmit = useCallback(
    async (guestName) => {
      const res = await fetch("/api/live-chat/guest-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Gagal masuk.");
      }
      if (liveChat) {
        liveChat.session = null;
      }
      window.location.reload();
    },
    [liveChat],
  );

  return (
    <SongRequestContext.Provider
      value={{
        queue,
        nowPlaying,
        quota: { remaining, total: REQUEST_LIMIT },
        isSubmitting,
        error,
        submit,
        refresh: fetchQueue,
        openSongRequest,
        modalOpen,
        setModalOpen,
        panelOpen,
        setPanelOpen,
      }}
    >
      {children}
      {isOnAir && (
        <>
          <GuestNameModal
            isOpen={showNameModal && !session}
            onClose={() => setShowNameModal(false)}
            onSubmit={handleNameSubmit}
          />
          {modalOpen && session && (
            <SongRequestModal
              isOpen={modalOpen}
              onClose={() => {
                setModalOpen(false);
                setError(null);
              }}
              onSubmit={submit}
              remaining={remaining}
              total={REQUEST_LIMIT}
              error={error}
            />
          )}
          {panelOpen && (
            <SongRequestPanel onClose={() => setPanelOpen(false)} />
          )}
        </>
      )}
    </SongRequestContext.Provider>
  );
}
