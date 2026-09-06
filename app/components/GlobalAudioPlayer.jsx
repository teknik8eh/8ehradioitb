"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { FiMessageCircle, FiMusic } from "react-icons/fi";
import ButtonPrimary from "@/app/components/ButtonPrimary";

import LiveChatWindow from "@/app/components/chat/LiveChatWindow";
import ChatInputBox from "@/app/components/chat/ChatInputBox";
import RequestLaguModal from "@/app/components/RequestLaguModal";
import { useLiveChat } from "@/app/hooks/useLiveChat";
import { subscribePusherChannel, unsubscribePusherChannel } from "@/app/hooks/usePusherClient";


// Form nama inline untuk chat panel di player (harus komponen terpisah agar hooks bisa dipakai)
function InlineNameForm({ onSubmit }) {
  const [submitting, setSubmitting] = React.useState(false);
  const [formErr, setFormErr] = React.useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = e.target.elements.nickname.value.trim();
    if (val.length < 2 || val.length > 30) {
      setFormErr('Nama minimal 2, maksimal 30 karakter');
      return;
    }
    setSubmitting(true);
    setFormErr('');
    const result = await onSubmit(val);
    if (result?.error) setFormErr(result.error);
    setSubmitting(false);
  };

  return (
    <div className="font-plus-jakarta-sans flex-1 flex flex-col items-center justify-center bg-gray-50 px-6 py-8">
      <p className="mb-1 font-bold text-gray-900 text-base text-center">Live Chat</p>
      <p className="mb-5 max-w-[250px] text-center text-xs leading-relaxed text-gray-500">Gunakan nama panggilan agar penyiar dan pendengar lain bisa mengenalmu.</p>
      <form className="w-full max-w-[280px] flex flex-col gap-2" onSubmit={handleSubmit}>
        <input
          name="nickname"
          type="text"
          maxLength={30}
          placeholder="Contoh: Andi"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm outline-none focus:border-[#D83232] focus:ring-4 focus:ring-[#D83232]/10 transition-all"
          autoFocus
          disabled={submitting}
        />
        {formErr && <p className="rounded-lg bg-[#D83232]/10 px-3 py-2 text-xs text-[#D83232]">{formErr}</p>}
        <ButtonPrimary
          type="submit"
          disabled={submitting}
          className="!w-full !rounded-lg !px-4 !py-3 !font-plus-jakarta-sans text-sm disabled:opacity-50"
        >
          {submitting ? 'Menghubungkan...' : 'Masuk ke Chat'}
        </ButtonPrimary>
      </form>
    </div>
  );
}

function clearStoredChatSession() {
  localStorage.removeItem('guest_name');
  localStorage.removeItem('chat_session_id');
  sessionStorage.removeItem('guest_name');
}

function RunningTitle({ text }) {
  const containerRef = useRef(null);
  const measureRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const measureNode = measureRef.current;
      if (!container || !measureNode) return;
      setContainerWidth(container.clientWidth);
      setIsOverflowing(measureNode.scrollWidth > container.clientWidth + 1);
    };

    const frameId = window.requestAnimationFrame(measure);
    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;

    if (resizeObserver && containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", measure);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", measure);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [text]);

  return (
    <div
      ref={containerRef}
      className="relative font-plus-jakarta-sans font-bold text-gray-800 text-xs md:text-sm overflow-hidden whitespace-nowrap"
      aria-label={text}
      title={text}
    >
      <span
        ref={measureRef}
        className="absolute invisible pointer-events-none whitespace-nowrap"
        aria-hidden="true"
      >
        {text}
      </span>

      {isOverflowing ? (
        <span
          className="inline-block min-w-max animate-player-title-marquee"
          style={{ "--player-title-width": `${containerWidth}px` }}
        >
          {text}
        </span>
      ) : (
        <span className="block truncate">{text}</span>
      )}
    </div>
  );
}

const GlobalAudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showPlayer, setShowPlayer] = useState(false);
  const [error, setError] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [showLiveChat, setShowLiveChat] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [features, setFeatures] = useState({
    liveChatEnabled: true,
    songRequestEnabled: true,
  });
  const [guestName, setGuestName] = useState(null);
  const [roomId, setRoomId] = useState(null);       // untuk cek status live
  const [chatRoomId, setChatRoomId] = useState(null); // untuk useLiveChat (diset setelah sesi valid)
  const [isLiveActive, setIsLiveActive] = useState(null); // null=loading, true/false
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const showLiveChatRef = useRef(showLiveChat);

  useEffect(() => {
    showLiveChatRef.current = showLiveChat;
  }, [showLiveChat]);

  useEffect(() => {
    if (!realtimeEnabled) return;

    const subscription = subscribePusherChannel('live-status');
    if (!subscription) return;
    const { channel } = subscription;

    const handleLiveStarted = (data) => {
      if (!data.roomId) return;
      window.dispatchEvent(new CustomEvent("onAirChanged", { detail: { onAir: true, ...data } }));
      setRoomId(data.roomId);
      setFeatures({
        liveChatEnabled: data.liveChatEnabled !== false,
        songRequestEnabled: data.songRequestEnabled !== false,
      });
      if (showLiveChatRef.current) setIsLiveActive(true);
    };

    const handleLiveEnded = (data) => {
      window.dispatchEvent(new CustomEvent("onAirChanged", { detail: { onAir: false, ...data } }));
      setFeatures({
        liveChatEnabled: data?.liveChatEnabled !== false,
        songRequestEnabled: data?.songRequestEnabled !== false,
      });
      clearStoredChatSession();
      setGuestName(null);
      setRoomId(null);
      setChatRoomId(null);
      setIsLiveActive(false);
    };

    channel.bind('live-started', handleLiveStarted);
    channel.bind('live-ended', handleLiveEnded);

    return () => {
      channel.unbind('live-started', handleLiveStarted);
      channel.unbind('live-ended', handleLiveEnded);
      unsubscribePusherChannel('live-status');
    };
  }, [realtimeEnabled]);

  useEffect(() => {
    if (!features.liveChatEnabled) {
      setShowLiveChat(false);
      setIsLiveActive(false);
    }
    if (!features.songRequestEnabled) {
      setIsRequestModalOpen(false);
    }
  }, [features.liveChatEnabled, features.songRequestEnabled]);

  useEffect(() => {
    const openRequest = () => {
      setRealtimeEnabled(true);
      setIsRequestModalOpen(true);
    };
    const syncGuestSession = (event) => {
      const data = event.detail || {};
      if (!data.guestName) return;
      localStorage.setItem('guest_name', data.guestName);
      if (data.sessionId) localStorage.setItem('chat_session_id', data.sessionId);
      setGuestName(data.guestName);
      if (data.roomId) {
        setRoomId(data.roomId);
        setChatRoomId(data.roomId);
        setIsLiveActive(true);
      }
    };

    window.addEventListener("openRequestLagu", openRequest);
    window.addEventListener("guestSessionChanged", syncGuestSession);
    return () => {
      window.removeEventListener("openRequestLagu", openRequest);
      window.removeEventListener("guestSessionChanged", syncGuestSession);
    };
  }, []);

 useEffect(() => {
  if (isPlaying) {
    const wasOffAir = sessionStorage.getItem('was_off_air');
    if (wasOffAir === 'true') {
      clearStoredChatSession();
      setGuestName(null);
      setChatRoomId(null);
      setShowLiveChat(false);
      sessionStorage.removeItem('was_off_air');
    }
  } else {
    const everPlayed = sessionStorage.getItem('ever_played');
    if (everPlayed === 'true') {
      sessionStorage.setItem('was_off_air', 'true');
    }
  }
}, [isPlaying]);

  // chatRoomId hanya di-pass ke useLiveChat setelah sesi guest valid
  const {
    messages,
    sendMessage,
    activeListeners,
    connectionError,
    reconnect,
    roomInactive,
  } = useLiveChat(chatRoomId, Boolean(guestName));

  const [playerConfig, setPlayerConfig] = useState({
    title: "",
    subtitle: "",
    coverImage: "",
  });

  const applyNowPlaying = useCallback((data) => {
    setPlayerConfig({
      title: data?.title || "",
      subtitle: data?.artist || data?.subtitle || "",
      coverImage: data?.coverImage || "",
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchNowPlaying = () => {
      fetch("/api/now-playing", { cache: "no-store" })
        .then((res) => {
          const ct = res.headers.get("content-type") || "";
          if (!res.ok || !ct.includes("application/json")) return null;
          return res.json();
        })
        .then((data) => {
          if (data && !cancelled) applyNowPlaying(data);
        })
        .catch(() => {
          if (cancelled) return;
          fetch("/api/player-config")
            .then((res) => {
              const ct = res.headers.get("content-type") || "";
              if (!res.ok || !ct.includes("application/json")) return null;
              return res.json();
            })
            .then((data) => {
              if (data && !cancelled) applyNowPlaying(data);
            })
            .catch(() => {
              if (!cancelled) {
                setPlayerConfig({ title: "", subtitle: "", coverImage: "" });
              }
            });
        });
    };

    fetchNowPlaying();
    const intervalId = window.setInterval(fetchNowPlaying, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [applyNowPlaying]);

  useEffect(() => {
    if (!realtimeEnabled) return;

    const subscription = subscribePusherChannel("now-playing");
    if (!subscription) return;
    const { channel } = subscription;

    channel.bind("updated", applyNowPlaying);

    return () => {
      channel.unbind("updated", applyNowPlaying);
      unsubscribePusherChannel("now-playing");
    };
  }, [applyNowPlaying, realtimeEnabled]);

  useEffect(() => {
    fetch("/api/stream-config")
      .then((res) => res.json())
      .then((data) => {
        setFeatures({
          liveChatEnabled: data?.liveChatEnabled !== false,
          songRequestEnabled: data?.songRequestEnabled !== false,
        });
      })
      .catch(() => {});
  }, []);

 useEffect(() => {
  let externalPause = false;
  const handler = (e) => {
    const playing = e.detail.isPlaying;
    setIsPlaying(playing);
    if (playing) {
      setRealtimeEnabled(true);
      setShowPlayer(true);
      sessionStorage.setItem('ever_played', 'true'); // ← tambahkan ini
    }
  };

  window.addEventListener("audioStateChanged", handler);
  const handlePodcastPlay = () => {
    setIsPlaying(false);
    setShowPlayer(false);
    externalPause = true;
    window.dispatchEvent(new CustomEvent("pauseRequested"));
  };
  window.addEventListener("podcastPlayRequested", handlePodcastPlay);

  if (!isPlaying && externalPause) {
    setShowPlayer(false);
    externalPause = false;
  }

  if (isPlaying) {
    window.dispatchEvent(new CustomEvent("radioPlayRequested"));
  }

  return () => {
    window.removeEventListener("audioStateChanged", handler);
    window.removeEventListener("podcastPlayRequested", handlePodcastPlay);
  };
}, [isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      window.dispatchEvent(new CustomEvent("radioPlayRequested"));
    }
  }, [isPlaying]);

  const togglePlay = () => {
    setRealtimeEnabled(true);
    if (isPlaying) {
      window.dispatchEvent(new CustomEvent("pauseRequested"));
    } else {
      window.dispatchEvent(new CustomEvent("playRequested"));
    }
  };

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setIsMuted(newVol === 0);
    window.dispatchEvent(
      new CustomEvent("volumeChanged", { detail: { volume: newVol } }),
    );
  };

  const handleMuteToggle = () => {
    if (isMuted) {
      setIsMuted(false);
      setVolume(1);
      window.dispatchEvent(
        new CustomEvent("volumeChanged", { detail: { volume: 1 } }),
      );
    } else {
      setIsMuted(true);
      setVolume(0);
      window.dispatchEvent(
        new CustomEvent("volumeChanged", { detail: { volume: 0 } }),
      );
    }
  };

  const toggleLiveChat = async () => {
    setRealtimeEnabled(true);
    if (!showLiveChat) {
      setIsLiveActive(null);
      // Pertama kali dibuka — fetch active room
      try {
        const res = await fetch('/api/live-chat/active-room');
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const data = await res.json();
          if (data.live && data.roomId) {
            setRoomId(data.roomId);
            setFeatures({
              liveChatEnabled: data.liveChatEnabled !== false,
              songRequestEnabled: data.songRequestEnabled !== false,
            });
            setIsLiveActive(data.liveChatEnabled !== false);

            const sessionRes = await fetch('/api/live-chat/guest-session');
            const sessionCt = sessionRes.headers.get('content-type') || '';
            const sessionData = sessionCt.includes('application/json') ? await sessionRes.json() : {};

            if (sessionData.active && sessionData.guestName && sessionData.roomId) {
              localStorage.setItem('guest_name', sessionData.guestName);
              if (sessionData.sessionId) localStorage.setItem('chat_session_id', sessionData.sessionId);
              setGuestName(sessionData.guestName);
              setRoomId(sessionData.roomId);
              setChatRoomId(sessionData.roomId);
            } else {
              clearStoredChatSession();
              setGuestName(null);
              setChatRoomId(null);
            }
          } else {
            clearStoredChatSession();
            setGuestName(null);
            setRoomId(null);
            setChatRoomId(null);
            setFeatures({
              liveChatEnabled: data.liveChatEnabled !== false,
              songRequestEnabled: data.songRequestEnabled !== false,
            });
            setIsLiveActive(false);
          }
        } else {
          clearStoredChatSession();
          setGuestName(null);
          setRoomId(null);
          setChatRoomId(null);
          setIsLiveActive(false);
        }
      } catch (err) {
        console.warn('[GlobalAudioPlayer] Gagal cek active room:', err);
        setChatRoomId(null);
        setIsLiveActive(false);
      }
    }
    setShowLiveChat((prev) => !prev);
  };

  const handleNameSubmit = async (name) => {
    try {
      const res = await fetch('/api/live-chat/guest-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: name }),
      });
      const ct = res.headers.get('content-type') || '';
      if (!res.ok) {
        const errData = ct.includes('application/json') ? await res.json() : {};
        return { error: errData.error || 'Gagal masuk ke chat' };
      }
      const data = ct.includes('application/json') ? await res.json() : {};
      localStorage.setItem('guest_name', name);
      if (data.sessionId) localStorage.setItem('chat_session_id', data.sessionId);
      setGuestName(name);
      if (data.roomId) setRoomId(data.roomId);
      // Baru sekarang aktifkan koneksi Pusher + fetch riwayat pesan
      setChatRoomId(data.roomId ?? roomId);
      return { error: null };
    } catch {
      return { error: 'Terjadi kesalahan koneksi' };
    }
  };

  const handleSendMessage = (text) => {
    sendMessage(text, guestName);
  };

  const isVisible = showPlayer;

  return (
    <>
      {isVisible && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          {showLiveChat && (
            <div className="font-plus-jakarta-sans absolute bottom-full right-2 left-2 md:left-auto md:right-60 mb-3 md:w-[340px] h-[min(68vh,540px)] md:h-[480px] max-h-[560px] bg-white border border-gray-200 rounded-2xl shadow-2xl shadow-gray-900/20 flex flex-col overflow-hidden">
              <div className="relative flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white flex-shrink-0">
                
                <div className="flex items-center gap-2">
                  <div>
                    <p className="font-bold text-gray-900 text-sm leading-tight">Live Chat</p>
                  </div>
                  <span
                    className="ml-1 text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-xl flex items-center gap-1"
                    title={`${activeListeners} peserta chat`}
                    aria-label={`${activeListeners} peserta chat`}
                  >
                    <FiMessageCircle className="text-green-500" size={12} aria-hidden="true" />
                    {activeListeners}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleLiveChat}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                    aria-label="Tutup live chat"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Saat room belum diketahui (loading) */}
                {isLiveActive === null && (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 text-sm">
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-[#D83232]" />
                    <span className="text-xs">Memeriksa status siaran...</span>
                  </div>
                )}

                {/* Tidak ada siaran aktif */}
                {isLiveActive === false && (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4 text-center bg-gray-50">
                    <p className="font-bold text-gray-700 text-sm">Siaran belum dimulai</p>
                    <p className="max-w-[220px] text-xs leading-relaxed text-gray-400">Live chat akan tersedia saat 8EH Radio sedang on air.</p>
                  </div>
                )}

                {/* Ada siaran aktif */}
                {isLiveActive === true && !roomInactive && (
                  !guestName ? (
                    <InlineNameForm onSubmit={handleNameSubmit} />
                  ) : (
                    <>
                      <LiveChatWindow 
                        messages={messages} 
                        currentUserName={guestName} 
                        connectionError={connectionError}
                        onReconnect={reconnect}
                      />
                      <ChatInputBox onSendMessage={handleSendMessage} />
                    </>
                  )
                )}
                {isLiveActive === true && roomInactive && (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4 text-center bg-gray-50">
                    <p className="font-bold text-gray-700 text-sm">Siaran telah selesai</p>
                    <p className="max-w-[220px] text-xs leading-relaxed text-gray-400">Live chat akan tersedia kembali pada siaran berikutnya.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white shadow-2xl border border-gray-200/80">
            <div className="max-w-full mx-auto px-2 md:px-6 lg:px-60 py-1 md:py-2 flex flex-col md:grid md:grid-cols-[minmax(0,18rem)_minmax(16rem,1fr)_minmax(0,18rem)] items-center gap-2 md:gap-4">
              <div className="flex items-center gap-3 w-full min-w-0">
                <button onClick={togglePlay} className="md:hidden w-8 h-8 rounded-full ring-1 ring-gray-300 hover:ring-gray-900 text-gray-800 flex items-center justify-center text-xl transition-all flex-shrink-0">
                  {isPlaying ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M8 5v14l11-7z"></path></svg>
                  )}
                </button>
                <div className="w-10 h-10 md:w-14 md:h-14 bg-gray-200 rounded-md relative overflow-hidden shadow-sm flex-shrink-0">
                  <img src={playerConfig.coverImage || "/8eh.png"} alt="cover" className="object-cover w-full h-full absolute inset-0" />
                </div>
                <div className="text-sm min-w-0 flex-1">
                  <RunningTitle text={playerConfig.title || "8EH Radio ITB"} />
                  <p className="text-gray-500 flex items-center gap-2 font-plus-jakarta-sans text-xs md:text-sm">
                    <span className="relative flex h-1.5 w-1.5 md:h-2 md:w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D83232] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 md:h-2 md:w-2 bg-[#D83232]"></span>
                    </span>
                    {playerConfig.subtitle || "Live Now"}
                  </p>
                </div>
                
                {features.songRequestEnabled && (
                  <button type="button" onClick={() => { setRealtimeEnabled(true); setIsRequestModalOpen(true); }} className="md:hidden w-9 h-9 rounded-full ring-1 ring-gray-300 hover:ring-[#D83232] text-gray-700 hover:text-[#D83232] flex items-center justify-center transition-all flex-shrink-0" aria-label="Request lagu" title="Request lagu">
                    <FiMusic size={18} />
                  </button>
                )}
                {features.liveChatEnabled && (
                  <button type="button" onClick={toggleLiveChat} className={`md:hidden w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${showLiveChat ? "bg-gray-900 text-white" : "ring-1 ring-gray-300 hover:ring-gray-900 text-gray-700"}`} aria-label="Buka live chat" title="Live chat">
                    <FiMessageCircle size={18} />
                  </button>
                )}
              </div>

              <div className="hidden md:flex flex-col items-center justify-center min-w-0">
                <div className="flex items-center justify-center w-full gap-6">
                  <button className="text-gray-500 hover:text-black disabled:opacity-40 text-xl" disabled>
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"></path></svg>
                  </button>
                  <button onClick={togglePlay} className="w-10 h-10 rounded-full ring-1 ring-gray-300 hover:ring-gray-900 text-gray-800 flex items-center justify-center text-xl transition-all">
                    {isPlaying ? (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M8 5v14l11-7z"></path></svg>
                    )}
                  </button>
                  <button className="text-gray-500 hover:text-black disabled:opacity-40 text-xl" disabled>
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"></path></svg>
                  </button>
                </div>
                <div className="w-full flex items-center gap-2 text-[10px] text-gray-500 mt-2 min-w-0">
                  <div className="flex-grow h-1 bg-gray-200 rounded-full relative min-w-0">
                    <div className="absolute h-full bg-gray-800 rounded-full" style={{ width: "0%" }} />
                  </div>
                </div>
              </div>

              <div className="hidden md:flex items-center gap-3 min-w-0 justify-end">
                <button type="button" onClick={handleMuteToggle} className="text-gray-600 focus:outline-none cursor-pointer">
                  {isMuted || volume === 0 ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M16.5 12a6.5 6.5 0 0 0-6.5-6.5v2A4.5 4.5 0 0 1 14.5 12h2z" fill="#d1d5db" />
                      <path d="M3 9v6h4l5 5V4L7 9H3zm16.5 3a6.5 6.5 0 0 0-6.5-6.5v2A4.5 4.5 0 0 1 17.5 12h2z" />
                      <line x1="19" y1="5" x2="5" y2="19" stroke="#ef4444" strokeWidth="2" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path>
                    </svg>
                  )}
                </button>
                <input type="range" min="0" max="1" step="0.1" value={volume} onChange={handleVolumeChange} className="w-20 md:w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-800" />
                {features.songRequestEnabled && (
                  <button type="button" onClick={() => { setRealtimeEnabled(true); setIsRequestModalOpen(true); }} className="w-9 h-9 rounded-full ring-1 ring-gray-300 hover:ring-[#D83232] text-gray-700 hover:text-[#D83232] flex items-center justify-center transition-all flex-shrink-0" aria-label="Request lagu" title="Request lagu">
                    <FiMusic size={18} />
                  </button>
                )}
                {features.liveChatEnabled && (
                  <button type="button" onClick={toggleLiveChat} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${showLiveChat ? "bg-gray-900 text-white" : "ring-1 ring-gray-300 hover:ring-gray-900 text-gray-700"}`} aria-label="Buka live chat" title="Live chat">
                    <FiMessageCircle size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {features.songRequestEnabled && (
        <RequestLaguModal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} />
      )}
    </>
  );
};

export default GlobalAudioPlayer;
