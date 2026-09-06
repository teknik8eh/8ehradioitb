"use client";
import { useOnAirStatus } from "@/app/hooks/useOnAirStatus";
import { FiMessageCircle, FiMusic, FiList } from "react-icons/fi";

export default function LiveBanner() {
  const { isOnAir } = useOnAirStatus();

  if (!isOnAir) return null;

  const openChat = () => {
    window.dispatchEvent(new CustomEvent("liveChat:open"));
  };

  const openSongRequest = () => {
    window.dispatchEvent(new CustomEvent("songRequest:open"));
  };

  const openQueue = () => {
    window.dispatchEvent(new CustomEvent("songRequestQueue:open"));
  };

  return (
    <div className="bg-gradient-to-r from-[#D83232] to-[#E85D4A] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>
          <span className="font-heading font-bold text-base sm:text-lg">
            Sedang Live!
          </span>
          <span className="text-white/80 font-body text-sm hidden sm:inline">
            Dengarkan siaran dan berinteraksi dengan penyiar
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openQueue}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full font-body text-sm font-medium transition-colors cursor-pointer"
          >
            <FiList size={16} />
            Antrian
          </button>
          <button
            onClick={openChat}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full font-body text-sm font-medium transition-colors cursor-pointer"
          >
            <FiMessageCircle size={16} />
            Live Chat
          </button>
          <button
            onClick={openSongRequest}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full font-body text-sm font-medium transition-colors cursor-pointer"
          >
            <FiMusic size={16} />
            Request Lagu
          </button>
        </div>
      </div>
    </div>
  );
}
