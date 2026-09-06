"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { FiMusic, FiSearch, FiClock } from "react-icons/fi";

const STATUS_LABELS = {
  PENDING: "Pending",
  QUEUED: "Antrian",
  NOW_PLAYING: "Playing",
  DONE: "Selesai",
  REJECTED: "Ditolak",
};

const STATUS_COLORS = {
  PENDING: "bg-yellow-100 text-yellow-700",
  QUEUED: "bg-gray-100 text-gray-600",
  NOW_PLAYING: "bg-blue-100 text-blue-700",
  DONE: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const FILTERS = ["ALL", "PENDING", "QUEUED", "NOW_PLAYING", "DONE", "REJECTED"];
const FILTER_LABELS = {
  ALL: "Semua",
  PENDING: "Pending",
  QUEUED: "Antrian",
  NOW_PLAYING: "Playing",
  DONE: "Selesai",
  REJECTED: "Ditolak",
};

function formatTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return "Baru saja";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} mnt lalu`;
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const h = date.getHours().toString().padStart(2, "0");
  const min = date.getMinutes().toString().padStart(2, "0");
  return `${d} ${["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"][date.getMonth()]}, ${h}.${min}`;
}

export default function SongRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState({});
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadingId, setLoadingId] = useState(null);
  const debounceRef = useRef(null);

  // Reject modal state
  const [rejectModal, setRejectModal] = useState({ open: false, id: null });
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const fetchRequests = useCallback(async (filter, q) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "ALL") params.set("status", filter);
      if (q) params.set("search", q);
      const res = await fetch(`/api/song-request?${params}`);
      const data = await res.json();
      setRequests(data.requests || []);
      setCounts(data.counts || {});
    } catch {
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests(activeFilter, search);
  }, [activeFilter]);

  const handleSearch = (val) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchRequests(activeFilter, val);
    }, 300);
  };

  const updateStatus = async (id, status, rejectedReason) => {
    setLoadingId(id);
    try {
      await fetch(`/api/song-request/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectedReason }),
      });
      await fetchRequests(activeFilter, search);
    } catch {
      alert("Gagal mengubah status. Coba lagi.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleRejectClick = (id) => {
    setRejectReason("");
    setRejectModal({ open: true, id });
  };

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) return;
    setIsRejecting(true);
    await updateStatus(rejectModal.id, "REJECTED", rejectReason.trim());
    setIsRejecting(false);
    setRejectModal({ open: false, id: null });
    setRejectReason("");
  };

  const pendingCount = counts["PENDING"] || 0;

  return (
    <div className="font-plus-jakarta-sans space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-plus-jakarta-sans font-bold text-gray-800">
            Song Requests
          </h1>
          {pendingCount > 0 && (
            <span className="bg-[#D83232] text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </div>
        <p className="text-gray-500 font-plus-jakarta-sans mt-1">
          Kelola request lagu dari pendengar selama siaran live.
        </p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Filter tabs */}
        <div className="px-6 pt-5 pb-0 flex items-center gap-2 flex-wrap border-b border-gray-100">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium mb-3 transition-colors ${
                activeFilter === f
                  ? "bg-[#D83232] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {FILTER_LABELS[f]}
              {counts[f] !== undefined && (
                <span className="ml-1.5 opacity-80">
                  {f === "ALL" ? counts["ALL"] || requests.length : counts[f] || 0}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 max-w-md focus-within:border-[#D83232] focus-within:ring-1 focus-within:ring-[#D83232]/10 transition-all">
            <FiSearch className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Cari judul, artis, atau nama requester..."
              className="flex-1 text-sm outline-none bg-transparent text-gray-700 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-[#D83232] rounded-full animate-spin mx-auto mb-3" />
              Memuat data...
            </div>
          ) : requests.length === 0 ? (
            <div className="py-16 text-center">
              <FiMusic className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Belum ada request lagu.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-6 py-3 text-left">Lagu</th>
                  <th className="px-6 py-3 text-left">Requester</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Waktu</th>
                  <th className="px-6 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Lagu */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {req.songCoverUrl ? (
                          <img
                            src={req.songCoverUrl}
                            alt={req.songTitle}
                            className="w-10 h-10 rounded-md object-cover flex-shrink-0 bg-gray-100"
                            onError={(e) => { e.target.style.display = "none"; }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <FiMusic className="text-gray-300 w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">
                            {req.songTitle}
                          </p>
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">
                            {req.songArtist}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Requester */}
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-800">{req.guestName}</p>
                      {req.message && (
                        <p className="text-xs text-gray-400 italic mt-0.5 max-w-[180px] truncate">
                          "{req.message}"
                        </p>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[req.status]}`}>
                        {STATUS_LABELS[req.status]}
                      </span>
                      {req.status === "REJECTED" && req.rejectedReason && (
                        <p className="text-xs text-[#D83232] mt-0.5 italic">{req.rejectedReason}</p>
                      )}
                    </td>

                    {/* Waktu */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <FiClock className="w-3 h-3" />
                        {formatTime(req.createdAt)}
                      </div>
                    </td>

                    {/* Aksi */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        {req.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => updateStatus(req.id, "QUEUED")}
                              disabled={loadingId === req.id}
                              className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                              Antrikan
                            </button>
                            <button
                              onClick={() => handleRejectClick(req.id)}
                              disabled={loadingId === req.id}
                              className="px-3 py-1.5 bg-[#D83232] hover:bg-[#B72929] text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                              Tolak
                            </button>
                          </>
                        )}
                        {req.status === "QUEUED" && (
                          <>
                            <button
                              onClick={() => updateStatus(req.id, "NOW_PLAYING")}
                              disabled={loadingId === req.id}
                              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                              Putar
                            </button>
                            <button
                              onClick={() => handleRejectClick(req.id)}
                              disabled={loadingId === req.id}
                              className="px-3 py-1.5 bg-[#D83232] hover:bg-[#B72929] text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                              Tolak
                            </button>
                          </>
                        )}
                        {req.status === "NOW_PLAYING" && (
                          <button
                            onClick={() => updateStatus(req.id, "DONE")}
                            disabled={loadingId === req.id}
                            className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                          >
                            Selesai
                          </button>
                        )}
                        {(req.status === "DONE" || req.status === "REJECTED") && (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModal.open && (
        <div
          className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setRejectModal({ open: false, id: null })}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-gray-900 text-lg mb-1">Tolak Request</h3>
            <p className="text-sm text-gray-500 mb-4">
              Berikan alasan penolakan untuk pendengar.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Contoh: Lagu sudah diputar sebelumnya..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#D83232] focus:ring-2 focus:ring-[#D83232]/10 resize-none"
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setRejectModal({ open: false, id: null })}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={isRejecting || !rejectReason.trim()}
                className="flex-1 py-2.5 rounded-xl bg-[#D83232] hover:bg-[#B72929] text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRejecting ? "Menolak..." : "Tolak Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
