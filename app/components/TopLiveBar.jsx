"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const QueuePanel = dynamic(() => import("@/app/components/QueuePanel"), { ssr: false });
const RequestLaguModal = dynamic(() => import("@/app/components/RequestLaguModal"), { ssr: false });

export default function TopLiveBar() {
  const [onAir, setOnAir] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  useEffect(() => {
    const checkOnAir = async () => {
      try {
        const res = await fetch("/api/stream-config");
        const data = await res.json();
        setOnAir(!!data.onAir);
      } catch {
        setOnAir(false);
      }
    };
    checkOnAir();
    const interval = setInterval(checkOnAir, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("onAirChanged", { detail: { onAir } }));
  }, [onAir]);

  // Listen event openQueue dari GlobalAudioPlayer
  useEffect(() => {
    const handler = () => setIsQueueOpen((prev) => !prev);
    window.addEventListener("openQueue", handler);
    return () => window.removeEventListener("openQueue", handler);
  }, []);

  if (!onAir) return null;

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[100] h-12 bg-[#e74c3c] flex items-center justify-between px-4 md:px-8">
        {/* Left: Live indicator */}
        <div className="flex items-center gap-2 text-white">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
          </span>
          <span className="font-bold text-sm">Sedang Live!</span>
          <span className="hidden sm:inline text-white/80 text-sm ml-1">
            Dengarkan siaran dan berinteraksi dengan penyiar
          </span>
        </div>

        {/* Right: Pill buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsQueueOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 transition-colors text-white text-xs font-medium px-3 py-1.5 rounded-full ${
              isQueueOpen ? "bg-white/40" : "bg-white/20 hover:bg-white/30"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            <span className="hidden sm:inline">Antrian</span>
          </button>

          <button
            onClick={() => window.dispatchEvent(new CustomEvent("openLiveChat"))}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-colors text-white text-xs font-medium px-3 py-1.5 rounded-full"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span className="hidden sm:inline">Live Chat</span>
          </button>

          <button
            onClick={() => window.dispatchEvent(new CustomEvent("openRequestLagu"))}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-colors text-white text-xs font-medium px-3 py-1.5 rounded-full"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
            <span className="hidden sm:inline">Request Lagu</span>
          </button>
        </div>
      </div>

      {/* Queue Panel */}
      <QueuePanel isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />
    </>
  );
}