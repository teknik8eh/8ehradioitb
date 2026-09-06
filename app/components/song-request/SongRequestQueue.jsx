"use client";
import { FiMusic } from "react-icons/fi";
import { useSongRequest } from "@/app/hooks/useSongRequest";
import NowPlayingRequest from "./NowPlayingRequest";

export default function SongRequestQueue() {
  const { queue, nowPlaying } = useSongRequest();

  return (
    <div className="space-y-3">
      <NowPlayingRequest request={nowPlaying} />

      {queue.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <h3 className="text-xs font-body font-semibold text-gray-500 uppercase tracking-wide">
              Antrian ({queue.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {queue.map((req, idx) => (
              <div key={req.id} className="flex items-center gap-3 p-3">
                <span className="text-xs font-body text-gray-400 w-5 text-center flex-shrink-0">
                  {idx + 1}
                </span>
                {req.songCoverUrl ? (
                  <img
                    src={req.songCoverUrl.replace("600x600", "100x100")}
                    alt=""
                    className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <FiMusic className="text-gray-400" size={14} />
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
          <div className="text-center py-8 text-gray-400 text-sm font-body">
            Belum ada lagu di antrian. Yuk request lagu favoritmu!
          </div>
        )
      )}
    </div>
  );
}
