'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage } from '../../hooks/useLiveChat';

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0]?.slice(0, 2) || '?')
    .toLocaleUpperCase('id-ID');
}

function getMessageTime(timestamp: Date) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? ''
    : `${new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(date).replace('.', ':')} WIB`;
}

interface LiveChatWindowProps {
  messages: ChatMessage[];
  currentUserName: string | null;
  isAdmin?: boolean;
  onDeleteMessage?: (id: string) => void;
  connectionError?: boolean;
  onReconnect?: () => void;
}

export default function LiveChatWindow({ 
  messages, 
  currentUserName, 
  isAdmin, 
  onDeleteMessage,
  connectionError,
  onReconnect
}: LiveChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getAbsoluteTime = (dateInput: Date) => {
    try {
      const date = new Date(dateInput);
      return date.toLocaleString("id-ID", {
        timeZone: 'Asia/Jakarta',
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus pesan ini?')) {
      if (onDeleteMessage) {
        onDeleteMessage(id);
      }
    }
  };

  return (
    <div className="font-plus-jakarta-sans flex-1 overflow-y-auto bg-gray-50 p-4 space-y-4 flex flex-col">
      {connectionError && (
        <div className="bg-[#D83232]/10 text-[#B72929] border border-[#D83232]/20 rounded-lg p-3 text-xs flex items-center justify-between gap-2 shadow-sm animate-in fade-in duration-200 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D83232] animate-pulse" />
            <span>Koneksi terputus. Gagal menghubungkan ke server.</span>
          </div>
          {onReconnect && (
            <button
              onClick={onReconnect}
              className="bg-[#D83232] hover:bg-[#B72929] text-white font-semibold px-3 py-1.5 rounded-md transition-colors cursor-pointer"
            >
              Coba Lagi
            </button>
          )}
        </div>
      )}

      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-white text-[#D83232] shadow-sm ring-1 ring-gray-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3h5.25M6.75 19.5 3 21l1.5-4.5A8.25 8.25 0 1 1 6.75 19.5Z" /></svg>
          </span>
          <p className="text-sm font-semibold text-gray-700">Belum ada pesan</p>
          <p className="mt-1 text-xs text-gray-400">Jadilah yang pertama menyapa.</p>
        </div>
      )}

      {messages.map((msg) => {
        const isOwnMessage = msg.senderName === currentUserName;

        return (
          <div
            key={msg.id}
            className={`flex min-w-0 items-start gap-2.5 ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}
          >
            {isAdmin && !isOwnMessage && !msg.deleted && (
              <button 
                onClick={() => handleDelete(msg.id)}
                className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-[#D83232] focus:outline-none"
                title="Hapus Pesan (Admin)"
                aria-label="Hapus pesan"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            )}

            {!isOwnMessage && (
              <div aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D83232]/10 text-[11px] font-bold text-[#B72929]">
                {getInitials(msg.senderName)}
              </div>
            )}

            <div className={`flex min-w-0 max-w-[calc(100%_-_2.875rem)] flex-col items-start ${isOwnMessage ? 'items-end' : ''}`}>
              <p className={`mb-1 max-w-full truncate text-sm font-semibold text-gray-900 ${isOwnMessage ? 'text-right' : ''}`} title={msg.senderName}>
                {msg.senderName}
              </p>
              <div className={`max-w-full rounded-2xl px-3.5 py-2 shadow-sm ${
                isOwnMessage
                  ? 'rounded-tr-md bg-[#D83232] text-white'
                  : 'rounded-tl-md bg-white text-gray-800 ring-1 ring-gray-100'
              }`}>
                {msg.deleted ? (
                  <p className={`text-sm leading-relaxed italic ${isOwnMessage ? 'text-white/70' : 'text-gray-400'}`}>
                    Pesan ini dihapus oleh moderator
                  </p>
                ) : (
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.text}</p>
                )}
                <p
                  className={`mt-0.5 text-right text-[10px] leading-tight ${isOwnMessage ? 'text-white/70' : 'text-gray-400'}`}
                  title={getAbsoluteTime(msg.timestamp)}
                >
                  {getMessageTime(msg.timestamp)}
                </p>
              </div>
            </div>

            {isOwnMessage && (
              <div aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D83232]/10 text-[11px] font-bold text-[#B72929]">
                {getInitials(msg.senderName)}
              </div>
            )}

            {isAdmin && isOwnMessage && !msg.deleted && (
              <button 
                onClick={() => handleDelete(msg.id)}
                className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-[#D83232] focus:outline-none"
                title="Hapus Pesan (Admin)"
                aria-label="Hapus pesan"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            )}
          </div>
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
}
