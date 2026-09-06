// app/components/live-chat/relativeTime.js
// Format waktu relatif Indonesia, tanpa library tambahan.

/**
 * @param {string|Date} dateInput
 * @returns {string} mis. "baru saja", "2 menit lalu", "1 jam lalu"
 */
export function formatRelative(dateInput) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const diffMs = Date.now() - date.getTime();
  const sec = Math.floor(diffMs / 1000);

  if (sec < 10) return "baru saja";
  if (sec < 60) return `${sec} detik lalu`;

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} menit lalu`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;

  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} hari lalu`;

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format absolut untuk tooltip (mis. "20 Jun 2026, 14.05").
 */
export function formatAbsolute(dateInput) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
