'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

interface Props {
  onTokenChange: (token: string) => void;
  resetKey?: number;
}

export default function TurnstileChallenge({ onTokenChange, resetKey = 0 }: Props) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const callbackRef = useRef(onTokenChange);
  const [scriptReady, setScriptReady] = useState(false);
  const [widgetSize, setWidgetSize] = useState<'flexible' | 'compact' | null>(null);

  useEffect(() => {
    callbackRef.current = onTokenChange;
  }, [onTokenChange]);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    const container = containerRef.current;
    const measure = () => setWidgetSize(container.clientWidth >= 300 ? 'flexible' : 'compact');
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [siteKey]);

  useEffect(() => {
    if (!scriptReady || !siteKey || !widgetSize || !containerRef.current || !window.turnstile) return;
    const widgetId = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      size: widgetSize,
      theme: 'light',
      callback: (token: string) => callbackRef.current(token),
      'expired-callback': () => {
        callbackRef.current('');
        if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
      },
      'error-callback': () => callbackRef.current(''),
    });
    widgetIdRef.current = widgetId;
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      callbackRef.current('');
    };
  }, [scriptReady, siteKey, widgetSize]);

  useEffect(() => {
    if (!resetKey || !widgetIdRef.current) return;
    callbackRef.current('');
    window.turnstile?.reset(widgetIdRef.current);
  }, [resetKey]);

  if (!siteKey) {
    return <p className="text-xs text-[#D83232]">Verifikasi belum dikonfigurasi. Hubungi pengelola.</p>;
  }

  return (
    <div className="my-3 w-full min-w-0" aria-label="Verifikasi keamanan">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={containerRef} className={`w-full ${widgetSize === 'compact' ? 'flex justify-center' : ''}`} />
    </div>
  );
}
