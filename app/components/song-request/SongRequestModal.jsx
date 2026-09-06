"use client";
import { useState, useEffect } from "react";
import { FiX, FiMusic } from "react-icons/fi";
import SongSearchInput from "./SongSearchInput";

export default function SongRequestModal({
  isOpen,
  onClose,
  onSubmit,
  remaining,
  total,
  error: externalError,
}) {
  const [selectedSong, setSelectedSong] = useState(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen && !submitting) onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, submitting]);

  useEffect(() => {
    if (isOpen) {
      setSelectedSong(null);
      setMessage("");
      setError("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (externalError) setError(externalError);
  }, [externalError]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSong) {
      setError("Pilih lagu terlebih dahulu.");
      return;
    }
    if (remaining <= 0) {
      setError(`Kamu sudah mencapai batas ${total} request untuk siaran ini.`);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await onSubmit({
        songTitle: selectedSong.title,
        songArtist: selectedSong.artist,
        songCoverUrl: selectedSong.artworkUrl || null,
        itunesTrackId: selectedSong.trackId || null,
        message: message.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err?.message || "Gagal mengirim request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !submitting && onClose()}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => !submitting && onClose()}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
          aria-label="Tutup"
        >
          <FiX size={20} />
        </button>

        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-14 h-14 rounded-full bg-[#D83232]/10 flex items-center justify-center mb-3">
            <FiMusic className="text-[#D83232]" size={26} />
          </div>
          <h2 className="font-heading text-xl font-bold text-gray-900">
            Request Lagu
          </h2>
          <p className="text-sm text-gray-500 font-body mt-1">
            Cari dan request lagu favoritmu untuk diputar penyiar.
          </p>
        </div>

        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-body">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!selectedSong ? (
            <SongSearchInput onSelect={setSelectedSong} />
          ) : (
            <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
              {selectedSong.artworkUrl ? (
                <img
                  src={selectedSong.artworkUrl.replace("600x600", "100x100")}
                  alt=""
                  className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <FiMusic className="text-gray-400" size={20} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-body font-medium text-gray-900 truncate">
                  {selectedSong.title}
                </p>
                <p className="text-sm text-gray-500 font-body truncate">
                  {selectedSong.artist}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSong(null)}
                className="text-xs text-[#D83232] hover:text-[#B72929] font-body font-medium flex-shrink-0 cursor-pointer"
              >
                Ganti
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-body text-gray-700 mb-1">
              Pesan untuk penyiar{" "}
              <span className="text-gray-400">(opsional)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="Tulis pesan singkat..."
              className="w-full border border-gray-300 p-3 rounded-lg font-body text-sm text-gray-900 bg-white focus:ring-2 focus:ring-[#D83232] focus:border-[#D83232] outline-none resize-none"
            />
            <p className="text-xs text-gray-400 text-right font-body mt-1">
              {message.length}/200
            </p>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-body text-gray-500">
              Sisa request:{" "}
              <span className="font-semibold text-gray-700">
                {remaining}/{total}
              </span>
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting || !selectedSong || remaining <= 0}
            className="w-full bg-[#D83232] hover:bg-[#B72929] text-white py-3 rounded-full font-body font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? "Mengirim..." : "Kirim Request"}
          </button>
        </form>

        <p className="text-[11px] text-gray-400 text-center mt-3 font-body">
          Request berlaku untuk sesi siaran saat ini saja.
        </p>
      </div>
    </div>
  );
}
