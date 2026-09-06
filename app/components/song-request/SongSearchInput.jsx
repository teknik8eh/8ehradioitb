"use client";
import { useState, useEffect, useRef } from "react";
import { FiSearch, FiMusic } from "react-icons/fi";

export default function SongSearchInput({ onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef(null);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/song-request/search?q=${encodeURIComponent(query.trim())}`,
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.items || []);
          setShowDropdown(true);
        }
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (song) => {
    onSelect(song);
    setQuery("");
    setResults([]);
    setShowDropdown(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <FiSearch
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={16}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder="Cari lagu atau artis..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg font-body text-sm text-gray-900 bg-white focus:ring-2 focus:ring-[#D83232] focus:border-[#D83232] outline-none"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-[#D83232] rounded-full animate-spin" />
          </div>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
          {results.map((song) => (
            <button
              key={song.trackId}
              type="button"
              onClick={() => handleSelect(song)}
              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left cursor-pointer border-b border-gray-100 last:border-0"
            >
              {song.artworkUrl ? (
                <img
                  src={song.artworkUrl.replace("600x600", "100x100")}
                  alt=""
                  className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <FiMusic className="text-gray-400" size={16} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate font-body">
                  {song.title}
                </p>
                <p className="text-xs text-gray-500 truncate font-body">
                  {song.artist}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {showDropdown && query.trim().length >= 2 && results.length === 0 && !isSearching && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4 text-center">
          <p className="text-sm text-gray-500 font-body">
            Tidak ada hasil untuk &quot;{query.trim()}&quot;
          </p>
        </div>
      )}
    </div>
  );
}
