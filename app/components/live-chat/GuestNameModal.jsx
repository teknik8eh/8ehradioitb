"use client";
import { useState, useEffect } from "react";
import { FiUser, FiX } from "react-icons/fi";

/**
 * Modal input nama panggilan untuk masuk Live Chat.
 * Pola mengikuti AIAssistModal (backdrop blur + escape).
 *
 * @param {{ isOpen: boolean, onClose: () => void, onSubmit: (name: string) => Promise<void> }}
 */
export default function GuestNameModal({ isOpen, onClose, onSubmit }) {
  const [name, setName] = useState("");
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
      setName("");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Nama panggilan minimal 2 karakter.");
      return;
    }
    if (trimmed.length > 30) {
      setError("Nama panggilan maksimal 30 karakter.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(trimmed);
    } catch (err) {
      setError(err?.message || "Gagal masuk. Coba lagi.");
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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <button
          onClick={() => !submitting && onClose()}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
          aria-label="Tutup"
        >
          <FiX size={20} />
        </button>

        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-14 h-14 rounded-full bg-[#D83232]/10 flex items-center justify-center mb-3">
            <FiUser className="text-[#D83232]" size={26} />
          </div>
          <h2 className="font-heading text-xl font-bold text-gray-900">
            Gabung Live Chat
          </h2>
          <p className="text-sm text-gray-500 font-body mt-1">
            Masukkan nama panggilanmu untuk mulai mengobrol selama siaran.
          </p>
        </div>

        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-body">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            autoFocus
            maxLength={30}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama panggilan..."
            className="w-full border border-gray-300 p-3 rounded-md font-body text-gray-900 bg-white focus:ring-2 focus:ring-[#D83232] focus:border-[#D83232] outline-none"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-4 bg-[#D83232] hover:bg-[#B72929] text-white py-3 rounded-full font-body font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? "Masuk..." : "Mulai Chat"}
          </button>
        </form>
        <p className="text-[11px] text-gray-400 text-center mt-3 font-body">
          Nama ini berlaku untuk sesi siaran saat ini saja.
        </p>
      </div>
    </div>
  );
}
