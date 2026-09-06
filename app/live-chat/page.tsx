'use client';

import { useState, useEffect } from 'react';
import { FiMessageCircle } from 'react-icons/fi';
import { useLiveChat } from '../hooks/useLiveChat';
import GuestNameModal from '../components/chat/GuestNameModal';
import LiveChatWindow from '../components/chat/LiveChatWindow';
import ChatInputBox from '../components/chat/ChatInputBox';
import { subscribePusherChannel, unsubscribePusherChannel } from '../hooks/usePusherClient';

export default function LiveChatPage() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState<boolean | null>(null); // null = loading, false = not live, true = live
  const [liveChatEnabled, setLiveChatEnabled] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);

  const { 
    messages,
    sendMessage, 
    isConnected, 
    activeListeners, 
    connectionError,
    reconnect,
    roomInactive,
  } = useLiveChat(roomId, Boolean(userName));

  useEffect(() => {
    // Helper: safe JSON fetch
    const safeJson = async (res: Response) => {
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Server mengembalikan non-JSON (HTTP ${res.status})`);
      }
      return res.json();
    };

    // 2. Cek active room dan status sesi guest
    const checkActiveRoomAndSession = async () => {
      try {
        const roomRes = await fetch('/api/live-chat/active-room');
        const roomData = await safeJson(roomRes);
        
        setIsLive(roomData.live);
        setLiveChatEnabled(roomData.liveChatEnabled !== false);
        if (roomData.live && roomData.liveChatEnabled !== false && roomData.roomId) {
          setRoomId(roomData.roomId);

          // Cek guest session jika room active
          try {
            const sessionRes = await fetch('/api/live-chat/guest-session');
            const sessionData = await safeJson(sessionRes);
            if (sessionData.active && sessionData.guestName) {
              setUserName(sessionData.guestName);
            }
          } catch (sessionErr) {
            // Session belum ada — GuestNameModal akan tampil
            console.warn('Belum ada sesi guest aktif:', sessionErr);
          }
        }
      } catch (err) {
        console.error('Gagal memverifikasi status siaran:', err);
        setIsLive(false);
      }
    };

    checkActiveRoomAndSession();
  }, []);

  useEffect(() => {
    const subscription = subscribePusherChannel('live-status');
    if (!subscription) return;
    const { channel } = subscription;

    const handleLiveStarted = async (data: { roomId?: string | null; liveChatEnabled?: boolean }) => {
      setLiveChatEnabled(data.liveChatEnabled !== false);
      if (!data.roomId) return;
      setRoomId(data.roomId);
      setIsLive(true);
      if (data.liveChatEnabled === false) return;

      const res = await fetch('/api/live-chat/guest-session');
      const sessionData = await res.json().catch(() => ({}));
      if (sessionData.active && sessionData.guestName) {
        setUserName(sessionData.guestName);
      }
    };

    const handleLiveEnded = () => {
      setIsLive(false);
      setLiveChatEnabled(false);
      setRoomId(null);
      setUserName(null);
    };

    channel.bind('live-started', handleLiveStarted);
    channel.bind('live-ended', handleLiveEnded);

    return () => {
      channel.unbind('live-started', handleLiveStarted);
      channel.unbind('live-ended', handleLiveEnded);
      unsubscribePusherChannel('live-status');
    };
  }, []);

  const handleSendMessage = (text: string) => {
    if (userName && typeof sendMessage === 'function') {
      sendMessage(text, userName);
    }
  };

  const handleSaveName = (name: string) => {
    setUserName(name);
  };

  return (
    // Responsive: w-full di mobile, max-w-lg di layar besar
    <div className="font-plus-jakarta-sans flex flex-col min-h-safe-screen w-full md:max-w-2xl md:mx-auto bg-white text-gray-900 md:border-x border-gray-200 relative overflow-hidden shadow-sm">
      
      {/* HEADER */}
      <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4 bg-white z-10">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-base font-bold flex items-center gap-2 text-gray-900">
              Live Chat
            </h1>
            <p
              className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5"
              title={`${activeListeners} peserta chat`}
              aria-label={`${activeListeners} peserta chat`}
            >
              <FiMessageCircle className={isConnected ? 'text-green-500' : 'text-gray-300'} size={14} aria-hidden="true" />
              {activeListeners}
            </p>
          </div>
        </div>
      </header>

      {/* CHAT WINDOW & OVERLAYS */}
      {isLive === null ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#D83232] mb-2"></div>
          <p className="text-sm">Memeriksa status siaran...</p>
        </div>
      ) : !isLive || roomInactive || !liveChatEnabled ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-400 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            {isLive && !liveChatEnabled ? "Live Chat Nonaktif" : "Siaran Belum Dimulai"}
          </h2>
            <p className="text-sm max-w-xs text-gray-500">
            {isLive && !liveChatEnabled
              ? "Live chat sedang tidak dibuka untuk sesi siaran ini."
              : "Live chat akan tersedia kembali saat siaran berikutnya dimulai."}
          </p>
        </div>
      ) : (
        <>
          {/* OVERLAYS */}
          {!userName && <GuestNameModal onSaveName={handleSaveName} />}

          {/* CHAT WINDOW */}
          <LiveChatWindow 
            messages={messages} 
            currentUserName={userName} 
            connectionError={connectionError}
            onReconnect={reconnect}
          />

          {/* CHAT INPUT */}
          {typeof handleSendMessage === 'function' && (
            <ChatInputBox onSendMessage={handleSendMessage} disabled={!userName} />
          )}
        </>
      )}
    </div>
  );
}
