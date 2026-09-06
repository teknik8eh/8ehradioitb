"use client";
import { useState, useEffect } from "react";

export default function ToastProvider() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      const { message, type = "success", duration = 4000 } = e.detail;
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type, duration }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    };
    window.addEventListener("showToast", handler);
    return () => window.removeEventListener("showToast", handler);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="font-plus-jakarta-sans fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white max-w-sm text-center animate-slideUp pointer-events-auto ${
            toast.type === "error"
              ? "bg-[#D83232]"
              : toast.type === "warning"
              ? "bg-orange-500"
              : "bg-gray-800"
          }`}
        >
          {toast.message}
        </div>
      ))}
      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideUp { animation: slideUp 0.2s ease; }
      `}</style>
    </div>
  );
}
