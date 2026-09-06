'use client';

import { useState, useEffect, useCallback } from 'react';
import { subscribePusherChannel, unsubscribePusherChannel } from './usePusherClient';

export interface ChatMessage {
  id: string;
  senderName: string;
  text: string;
  timestamp: Date;
  deleted?: boolean;
}

export interface ActiveGuest {
  sessionId: string;
  name: string;
  isMuted: boolean; 
}

export function useLiveChat(roomId: string | null, enabled = true) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [reconnectTrigger, setReconnectTrigger] = useState(0);
  const [roomInactive, setRoomInactive] = useState(false);
  
  // States untuk Admin / Moderasi
  const [activeListeners, setActiveListeners] = useState<number>(0);
  const [activeGuests, setActiveGuests] = useState<ActiveGuest[]>([]);

  const reconnect = useCallback(() => {
    setConnectionError(false);
    setReconnectTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!roomId || !enabled) {
      setIsConnected(false);
      setConnectionError(false);
      setRoomInactive(false);
      setMessages([]);
      return;
    }

    let disposed = false;

    setRoomInactive(false);

    // 1. Ambil riwayat pesan yang sudah ada di server
    fetch(`/api/live-chat/${roomId}/messages`)
      .then(res => {
        if (!res.ok) throw new Error('Gagal mengambil pesan');
        return res.json();
      })
      .then(data => {
        if (disposed) return;
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages.map((m: any) => ({
            id: m.id,
            senderName: m.guestName,
            text: m.content,
            timestamp: new Date(m.createdAt),
            deleted: m.isDeleted,
          })));
        }
      })
      .catch(err => {
        if (disposed) return;
        console.error('Gagal memuat riwayat pesan:', err);
        setConnectionError(true);
      });

    // 2. Fetch stats awal & lakukan polling berkala untuk active listeners & guests
    const fetchStats = () => {
      fetch(`/api/live-chat/${roomId}/stats`)
        .then(res => {
          if (!res.ok) throw new Error('Gagal mengambil stats');
          return res.json();
        })
        .then(data => {
          if (disposed) return;
          if (data.activeListeners !== undefined) setActiveListeners(data.activeListeners);
          if (data.activeGuests !== undefined) setActiveGuests(data.activeGuests);
        })
        .catch(err => console.error('Gagal memuat stats:', err));
    };

    fetchStats();
    const statsInterval = setInterval(fetchStats, 15000);

    const channelName = `chat-room-${roomId}`;
    const subscription = subscribePusherChannel(channelName);
    if (!subscription) {
      return () => {
        disposed = true;
        clearInterval(statsInterval);
      };
    }

    const { pusher, channel } = subscription;

    const handleConnected = () => {
      setIsConnected(true);
      setConnectionError(false);
    };

    const handleError = () => {
      setIsConnected(false);
      setConnectionError(true);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
    };

    const handleNewMessage = (data: any) => {
      setMessages((prev) => {
        if (prev.some(m => m.id === data.id)) return prev;
        return [...prev, {
          id: data.id,
          senderName: data.guestName,
          text: data.content,
          timestamp: new Date(data.createdAt),
          deleted: false
        }];
      });
    };

    const handleMessageDeleted = (data: any) => {
      setMessages((prev) => prev.map(m => 
        m.id === data.id 
          ? { ...m, text: "Pesan ini dihapus oleh moderator", deleted: true } 
          : m
      ));
    };

    const handleGuestMuted = (data: any) => {
      setActiveGuests((prev) => prev.map(g => 
        g.sessionId === data.sessionId 
          ? { ...g, isMuted: data.isMuted } 
          : g
      ));

      // Cek jika diri sendiri yang di-mute
      const mySessionId = localStorage.getItem('chat_session_id');
      if (mySessionId === data.sessionId && data.isMuted) {
        alert('Anda telah di-mute oleh moderator.');
      }
    };

    const handleRoomStatus = (data: any) => {
      if (!data.isActive) {
        setRoomInactive(true);
        setIsConnected(false);
      }
    };

    pusher.connection.bind('connected', handleConnected);
    pusher.connection.bind('error', handleError);
    pusher.connection.bind('disconnected', handleDisconnected);
    channel.bind('new-message', handleNewMessage);
    channel.bind('message-deleted', handleMessageDeleted);
    channel.bind('guest-muted', handleGuestMuted);
    channel.bind('room-status', handleRoomStatus);

    return () => {
      disposed = true;
      clearInterval(statsInterval);
      pusher.connection.unbind('connected', handleConnected);
      pusher.connection.unbind('error', handleError);
      pusher.connection.unbind('disconnected', handleDisconnected);
      channel.unbind('new-message', handleNewMessage);
      channel.unbind('message-deleted', handleMessageDeleted);
      channel.unbind('guest-muted', handleGuestMuted);
      channel.unbind('room-status', handleRoomStatus);
      unsubscribePusherChannel(channelName);
    };
  }, [roomId, enabled, reconnectTrigger]);

  const sendMessage = useCallback(async (text: string, senderName?: string) => {
    if (!roomId) return { ok: false, error: 'Room chat belum aktif' };
    if (!text.trim()) return { ok: false, error: 'Pesan tidak boleh kosong' };
    try {
      const response = await fetch(`/api/live-chat/${roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { ok: false, error: errorData.error || 'Gagal mengirim pesan' };
      }
      return { ok: true };
    } catch (error) {
      console.error('Error saat mengirim pesan:', error);
      return { ok: false, error: 'Gagal terhubung ke server' };
    }
  }, [roomId]);

  // Fungsi khusus Admin untuk menghapus pesan
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!roomId) return;
    try {
      const response = await fetch(`/api/live-chat/${roomId}/messages/${messageId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Gagal menghapus pesan');
      }
    } catch (error) {
      console.error('Gagal menghapus pesan', error);
    }
  }, [roomId]);

  // Fungsi khusus Admin untuk membisukan (mute) user
  const muteGuest = useCallback(async (targetSessionId: string, action: 'mute' | 'unmute') => {
    if (!roomId) return;
    try {
      const response = await fetch(`/api/live-chat/${roomId}/mute/${targetSessionId}`, {
        method: action === 'mute' ? 'POST' : 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || `Gagal mengubah status mute`);
        return;
      }
      
      alert(`User berhasil di-${action}`);
    } catch (error) {
      console.error('Gagal mengubah status mute', error);
    }
  }, [roomId]);

  return {
    messages,
    isConnected,
    connectionError,
    roomInactive,
    reconnect,
    sendMessage,
    activeListeners,
    activeGuests,
    deleteMessage,
    muteGuest
  };
}
