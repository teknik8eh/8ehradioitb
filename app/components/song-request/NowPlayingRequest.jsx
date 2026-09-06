"use client";
import { FiMusic } from "react-icons/fi";

export default function NowPlayingRequest({ request }) {
  if (!request) return null;

  return (
    <div className="bg-gradient-to-r from-[#D83232]/5 to-orange-50 border border-[#D83232]/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D83232] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D83232]" />
        </span>
        <span className="text-xs font-body font-semibold text-[#D83232] uppercase tracking-wide">
          Now Playing
        </span>
      </div>
      <div className="flex items-center gap-3">
        {request.songCoverUrl ? (
          <img
            src={request.songCoverUrl.replace("600x600", "200x200")}
            alt=""
            className="w-16 h-16 md:w-20 md:h-20 rounded-lg object-cover flex-shrink-0 shadow-sm"
          />
        ) : (
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
            <FiMusic className="text-gray-400" size={24} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-heading font-bold text-gray-900 truncate text-base">
            {request.songTitle}
          </p>
          <p className="text-sm text-gray-600 font-body truncate">
            {request.songArtist}
          </p>
          <p className="text-xs text-gray-400 font-body mt-1">
            Request oleh{" "}
            <span className="font-medium text-gray-500">
              {request.guestName}
            </span>
          </p>
          {request.message && (
            <p className="text-xs text-gray-500 font-body mt-1 italic">
              &quot;{request.message}&quot;
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
