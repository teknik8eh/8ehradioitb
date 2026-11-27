'use client';

import { useEffect, useState } from 'react';

const FALLBACK_TITLE = 'Live Chat';

export function usePlayerChatTitle(enabled = true) {
  const [title, setTitle] = useState(FALLBACK_TITLE);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;

    const refresh = async () => {
      try {
        const response = await fetch('/api/player-config', { cache: 'no-store' });
        if (!response.ok) throw new Error('Gagal memuat judul siaran');
        const config = await response.json();
        if (!disposed) {
          setTitle(typeof config?.title === 'string' && config.title.trim()
            ? config.title.trim()
            : FALLBACK_TITLE);
        }
      } catch {
        if (!disposed) setTitle(FALLBACK_TITLE);
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    refresh();
    const interval = window.setInterval(refreshWhenVisible, 15_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [enabled]);

  return title;
}
