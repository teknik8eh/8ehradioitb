"use client";
import { FiX, FiMusic, FiPlus } from "react-icons/fi";
import { useSongRequest } from "@/app/hooks/useSongRequest";
import NowPlayingRequest from "./NowPlayingRequest";

export default function SongRequestPanel({ onClose }) {
  const { queue, nowPlaying, openSongRequest, quota } = useSongRequest();

  return (
    <div className="fixed bottom-24 right-4 md:right-6 z-[55] w-[calc(100vw-2rem)] sm:w-96 h-[60vh] max-h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden origin-bottom-right">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#D83232] text-white">
        <div className="flex items-center gap-2 min-w-0">
          <FiMusic size={16} />
          <span className="font-heading font-semibold truncate">
            Antrian Lagu
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {quota.remaining > 0 && (
            <button
              onClick={() => {
                onClose();
                setTimeout(() => openSongRequest(), 100);
              }}
              className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
            >
              <FiPlus size={12} />
              Request
            </button>
          )}
          <button
            onClick={onClose}
            className="hover:bg-white/20 rounded-full p-1 cursor-pointer"
            aria-label="Tutup"
          >
            <FiX size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 bg-gray-50">
        {/* Now Playing */}
        {nowPlaying && (
          <div className="mb-3">
            <NowPlayingRequest request={nowPlaying} />
          </div>
        )}

        {/* Queue */}
        {queue.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
              <h3 className="text-[11px] font-body font-semibold text-gray-500 uppercase tracking-wide">
                Selanjutnya ({queue.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {queue.map((req, idx) => (
                <div key={req.id} className="flex items-center gap-2.5 p-2.5">
                  <span className="text-[11px] font-body text-gray-400 w-4 text-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  {req.songCoverUrl ? (
                    <img
                      src={req.songCoverUrl.replace("600x600", "100x100")}
                      alt=""
                      className="w-9 h-9 rounded-md object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <FiMusic className="text-gray-400" size={12} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-body font-medium text-gray-900 truncate">
                      {req.songTitle}
                    </p>
                    <p className="text-xs text-gray-500 font-body truncate">
                      {req.songArtist} · {req.guestName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          !nowPlaying && (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 px-6">
              <FiMusic className="mb-3 text-gray-300" size={32} />
              <p className="text-sm font-body">
                Belum ada lagu di antrian.
              </p>
              <p className="text-xs font-body mt-1">
                Yuk request lagu favoritmu!
              </p>
            </div>
          )
        )}
      </div>

      {/* Footer — quota info */}
      <div className="px-4 py-2.5 border-t border-gray-200 bg-white text-center">
        <p className="text-xs font-body text-gray-400">
          Sisa request kamu:{" "}
          <span className="font-semibold text-gray-600">
            {quota.remaining}/{quota.total}
          </span>
        </p>
      </div>
    </div>
  );
}
