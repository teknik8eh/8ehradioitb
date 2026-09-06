'use client';

import { useState } from 'react';

interface ChatInputBoxProps {
  onSendMessage: (text: string) => void;
  disabled?: boolean;
}

export default function ChatInputBox({ onSendMessage, disabled = false }: ChatInputBoxProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    onSendMessage(trimmedText);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="font-plus-jakarta-sans border-t border-gray-100 bg-white px-4 py-3">
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1.5 pl-4 shadow-sm focus-within:border-[#D83232]/40 focus-within:ring-2 focus-within:ring-[#D83232]/10">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Masukkan nama dulu...' : 'Tulis pesan...'}
          disabled={disabled}
          className="min-w-0 flex-1 bg-transparent py-2 text-sm text-gray-900 placeholder-gray-400 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />

        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#D83232] text-white transition-all hover:bg-[#B72929] hover:shadow-lg hover:shadow-[#D83232]/20 active:scale-90 disabled:opacity-40 disabled:hover:bg-[#D83232] disabled:hover:shadow-none"
          aria-label="Kirim pesan"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
