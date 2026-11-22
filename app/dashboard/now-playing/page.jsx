"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  FiArrowDown,
  FiArrowUp,
  FiEdit2,
  FiMusic,
  FiPlus,
  FiRadio,
  FiSave,
  FiSearch,
  FiSkipForward,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { hasAnyRole } from "@/lib/roleUtils";

function emptyItem() {
  return { title: "", artist: "", coverImage: "" };
}

export default function NowPlayingDashboard() {
  const { data: session, status } = useSession();
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState("");
  const [nowPlaying, setNowPlaying] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newItem, setNewItem] = useState(emptyItem);
  const [editingPlaylistId, setEditingPlaylistId] = useState("");
  const [editingPlaylistName, setEditingPlaylistName] = useState("");
  const [editingItemId, setEditingItemId] = useState("");
  const [editingItem, setEditingItem] = useState(emptyItem);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [devices, setDevices] = useState([]);
  const [activeDeviceId, setActiveDeviceId] = useState(null);
  const [devicesError, setDevicesError] = useState("");

  const canManage =
    session && hasAnyRole(session.user.role, ["MUSIC", "DEVELOPER"]);

  // Panel perangkat hanya untuk TECHNIC/DEVELOPER
  const canManageDevices =
    session && hasAnyRole(session.user.role, ["TECHNIC", "DEVELOPER"]);

  const loadDevices = async () => {
    if (!canManageDevices) return;
    setDevicesError("");
    try {
      const res = await fetch("/api/studio/devices", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Gagal memuat perangkat.");
      setDevices(data.devices || []);
      setActiveDeviceId(data.activeDeviceId || null);
    } catch (e) {
      setDevicesError(e.message);
    }
  };

  const deviceAction = async (kind, device, message) => {
    setSaving(true);
    setError("");
    try {
      let res;
      if (kind === "select") {
        res = await fetch("/api/studio/devices", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "select", id: device.id }),
        });
      } else if (kind === "clear") {
        res = await fetch("/api/studio/devices", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "clearSelection" }),
        });
      } else if (kind === "metadata") {
        res = await fetch("/api/studio/devices", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: device.id,
            metadataEnabled: !device.metadataEnabled,
          }),
        });
      } else if (kind === "revoke") {
        res = await fetch(`/api/studio/devices?id=${device.id}`, {
          method: "DELETE",
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Aksi gagal.");
      setSuccess(message);
      await loadDevices();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedPlaylist = useMemo(
    () => playlists.find((playlist) => playlist.id === selectedPlaylistId),
    [playlists, selectedPlaylistId],
  );

  const fetchNowPlaying = async () => {
    const res = await fetch("/api/now-playing", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load now playing.");
    const data = await res.json();
    setNowPlaying(data);
  };

  const fetchPlaylists = async () => {
    const res = await fetch("/api/now-playing/playlists", {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to load playlists.");
    const data = await res.json();
    setPlaylists(data);

    setSelectedPlaylistId((current) => {
      if (current && data.some((playlist) => playlist.id === current)) {
        return current;
      }
      return data[0]?.id || "";
    });
  };

  const loadData = async () => {
    setError("");
    setLoading(true);
    try {
      await Promise.all([fetchNowPlaying(), fetchPlaylists()]);
      await loadDevices();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManage) loadData();
    if (status !== "loading" && !canManage) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage, status]);

  const runPlaylistAction = async (method, payload, successMessage) => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/now-playing/playlists", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save playlist.");
      setPlaylists(data);
      setSuccess(successMessage);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const runNowPlayingAction = async (payload, successMessage) => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/now-playing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update now playing.");
      setNowPlaying(data);
      setSuccess(successMessage);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) {
      setError("Playlist name is required.");
      return;
    }

    const data = await runPlaylistAction(
      "POST",
      { action: "create-playlist", name: newPlaylistName },
      "Playlist created.",
    );
    if (data) {
      const created = data.find((playlist) => playlist.name === newPlaylistName);
      setSelectedPlaylistId(created?.id || data[0]?.id || "");
      setNewPlaylistName("");
    }
  };

  const updatePlaylist = async () => {
    if (!editingPlaylistName.trim()) {
      setError("Playlist name is required.");
      return;
    }

    const data = await runPlaylistAction(
      "PATCH",
      {
        action: "update-playlist",
        playlistId: editingPlaylistId,
        name: editingPlaylistName,
      },
      "Playlist renamed.",
    );
    if (data) {
      setEditingPlaylistId("");
      setEditingPlaylistName("");
    }
  };

  const deletePlaylist = async (playlistId) => {
    const data = await runPlaylistAction(
      "DELETE",
      { playlistId },
      "Playlist archived.",
    );
    if (data) {
      setSelectedPlaylistId(data[0]?.id || "");
      await fetchNowPlaying().catch(() => {});
    }
  };

  const addItem = async () => {
    if (!selectedPlaylistId || !newItem.title.trim() || !newItem.artist.trim()) {
      setError("Title and artist are required.");
      return;
    }

    const data = await runPlaylistAction(
      "POST",
      {
        action: "add-item",
        playlistId: selectedPlaylistId,
        title: newItem.title,
        artist: newItem.artist,
        coverImage: newItem.coverImage,
      },
      "Item added.",
    );
    if (data) {
      setNewItem(emptyItem());
      setSearchQuery("");
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const updateItem = async () => {
    if (!editingItem.title.trim() || !editingItem.artist.trim()) {
      setError("Title and artist are required.");
      return;
    }

    const data = await runPlaylistAction(
      "PATCH",
      {
        action: "update-item",
        itemId: editingItemId,
        title: editingItem.title,
        artist: editingItem.artist,
        coverImage: editingItem.coverImage,
      },
      "Item updated.",
    );
    if (data) {
      setEditingItemId("");
      setEditingItem(emptyItem());
      await fetchNowPlaying().catch(() => {});
    }
  };

  const moveItem = (itemId, direction) => {
    runPlaylistAction(
      "PATCH",
      { action: "move-item", itemId, direction },
      "Item order updated.",
    );
  };

  const deleteItem = async (itemId) => {
    const data = await runPlaylistAction("DELETE", { itemId }, "Item deleted.");
    if (data) await fetchNowPlaying().catch(() => {});
  };

  const startEditPlaylist = (playlist) => {
    setEditingPlaylistId(playlist.id);
    setEditingPlaylistName(playlist.name);
  };

  const startEditItem = (item) => {
    setEditingItemId(item.id);
    setEditingItem({
      title: item.title,
      artist: item.artist,
      coverImage: item.coverImage || "",
    });
  };

  const searchItunes = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setShowSearchResults(true);
    setError("");

    try {
      const res = await fetch("/api/itunes/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to search iTunes.");
      setSearchResults(data.items || []);
    } catch (err) {
      setSearchResults([]);
      setError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const selectItunesResult = (item) => {
    setNewItem({
      title: item.title || "",
      artist: item.artist || "",
      coverImage: item.artworkUrl || "",
    });
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
    setSuccess("iTunes track selected. Click Add to save it.");
  };

  const coverFor = (coverImage) => coverImage || "/8eh.png";

  if (status === "loading" || loading) {
    return <div className="p-8 text-center font-body">Loading...</div>;
  }

  if (!canManage) {
    return (
      <div className="p-8 text-center font-body text-red-600">
        Access Denied.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold text-gray-900">
          Now Playing
        </h1>
        <p className="text-gray-600 font-body mt-1">
          Manage manual playlists for live broadcasts.
        </p>
      </div>

      {error && (
        <div className="text-red-600 font-body bg-red-50 p-3 rounded-md text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="text-green-600 font-body bg-green-50 p-3 rounded-md text-sm">
          {success}
        </div>
      )}

      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-md bg-red-100 text-red-600 flex items-center justify-center overflow-hidden flex-shrink-0">
              {nowPlaying?.coverImage ? (
                <img
                  src={coverFor(nowPlaying.coverImage)}
                  alt={nowPlaying?.title || "Now playing cover"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <FiRadio />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-gray-500 font-bold">
                Current Now Playing
              </p>
              <h2 className="font-heading text-xl font-bold text-gray-900 truncate">
                {nowPlaying?.title || "8EH Radio ITB"}
              </h2>
              <p className="text-sm text-gray-500 truncate">
                {nowPlaying?.artist || "Live Now"} -{" "}
                {nowPlaying?.source || "fallback"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                runNowPlayingAction(
                  { action: "next" },
                  "Moved to next item.",
                )
              }
              className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-md font-body font-semibold disabled:opacity-50 cursor-pointer"
            >
              <FiSkipForward />
              Next
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                runNowPlayingAction(
                  { action: "clear" },
                  "Now playing cleared to fallback.",
                )
              }
              className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-800 px-4 py-2 rounded-md border border-gray-300 font-body font-semibold disabled:opacity-50 cursor-pointer"
            >
              <FiX />
              Clear to Web Fallback
            </button>
          </div>
        </div>
      </section>

      {/* ===== PANEL PERANGKAT 8EH STUDIO ===== */}
      {canManageDevices && (
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-heading font-bold text-xl text-gray-900">
              Perangkat 8EH Studio
            </h2>
            <p className="text-sm text-gray-500 font-body">
              Pilih device yang boleh mengirim metadata; device lain akan ditolak.
            </p>
          </div>
          <button
            type="button"
            onClick={loadDevices}
            className="text-sm px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50 font-body"
          >
            Refresh
          </button>
        </div>

        {devicesError && (
          <p className="text-sm text-red-600 font-body">{devicesError}</p>
        )}

        {!devices.length && !devicesError && (
          <p className="text-sm text-gray-500 font-body">
            Belum ada perangkat terhubung. Jalankan app 8EH Studio → Login dengan
            Google untuk memasangkan.
          </p>
        )}

        <div className="space-y-3">
          {devices.map((d) => {
            const isActiveDevice = d.deviceId === activeDeviceId;
            return (
              <div
                key={d.id}
                className={`p-4 rounded-lg border ${
                  isActiveDevice
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 font-body truncate">
                        {d.deviceName}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          d.scope === "broadcast"
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {d.scope === "broadcast" ? "Siaran+Metadata" : "Metadata"}
                      </span>
                      {!d.active && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                          dicabut
                        </span>
                      )}
                      {!d.metadataEnabled && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                          metadata OFF
                        </span>
                      )}
                      {isActiveDevice && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-600 text-white">
                          AKTIF
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-body mt-1">
                      {d.ownerName || "—"} · terakhir dilihat:{" "}
                      {d.lastSeenAt
                        ? new Date(d.lastSeenAt).toLocaleString("id-ID")
                        : "belum pernah"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={saving || isActiveDevice}
                      onClick={() =>
                        deviceAction("select", d, `${d.deviceName} dipilih sebagai sumber metadata.`)
                      }
                      className="text-sm px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white disabled:opacity-40 cursor-pointer"
                    >
                      {isActiveDevice ? "Terpilih" : "Jadikan Aktif"}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        deviceAction(
                          "metadata",
                          d,
                          `Metadata ${!d.metadataEnabled ? "diaktifkan" : "dimatikan"} untuk ${d.deviceName}.`,
                        )
                      }
                      className={`text-sm px-3 py-1.5 rounded-md cursor-pointer ${
                        d.metadataEnabled
                          ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                          : "bg-yellow-500 hover:bg-yellow-600 text-white"
                      } disabled:opacity-50`}
                    >
                      {d.metadataEnabled ? "Matikan Metadata" : "Aktifkan Metadata"}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Cabut akses ${d.deviceName}? App harus login ulang.`,
                          )
                        )
                          return;
                        deviceAction("revoke", d, `Akses ${d.deviceName} dicabut.`);
                      }}
                      className="text-sm px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 cursor-pointer"
                    >
                      Cabut Akses
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {activeDeviceId && (
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              deviceAction("clear", null, "Pemilihan device dikosongkan (aturan: bebas).")
            }
            className="mt-4 text-sm text-gray-600 hover:text-gray-900 underline cursor-pointer"
          >
            Kosongkan pilihan (semua device bebas kirim)
          </button>
        )}
      </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
          <h2 className="font-heading font-bold text-xl text-gray-900 mb-4">
            Playlists
          </h2>

          <div className="flex gap-2 mb-4">
            <input
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              className="flex-1 min-w-0 border border-gray-300 p-2 rounded-md font-body text-gray-900 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Playlist name"
            />
            <button
              type="button"
              disabled={saving}
              onClick={createPlaylist}
              className="bg-red-600 hover:bg-red-700 text-white px-3 rounded-md disabled:opacity-50 cursor-pointer"
              aria-label="Create playlist"
            >
              <FiPlus />
            </button>
          </div>

          <div className="space-y-2">
            {playlists.length === 0 ? (
              <p className="text-sm text-gray-500 font-body py-4">
                No playlists yet.
              </p>
            ) : (
              playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  className={`border rounded-lg p-3 ${
                    playlist.id === selectedPlaylistId
                      ? "border-red-400 bg-red-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  {editingPlaylistId === playlist.id ? (
                    <div className="flex gap-2">
                      <input
                        value={editingPlaylistName}
                        onChange={(e) => setEditingPlaylistName(e.target.value)}
                        className="flex-1 min-w-0 border border-gray-300 p-2 rounded-md text-sm text-gray-900 bg-white"
                      />
                      <button
                        type="button"
                        onClick={updatePlaylist}
                        className="text-green-600 hover:text-green-800 cursor-pointer"
                        aria-label="Save playlist"
                      >
                        <FiSave />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPlaylistId("")}
                        className="text-gray-500 hover:text-gray-800 cursor-pointer"
                        aria-label="Cancel playlist edit"
                      >
                        <FiX />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPlaylistId(playlist.id)}
                        className="flex-1 text-left min-w-0 cursor-pointer"
                      >
                        <p className="font-heading font-bold text-gray-900 truncate">
                          {playlist.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {playlist.items?.length || 0} items
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditPlaylist(playlist)}
                        className="text-gray-500 hover:text-gray-900 cursor-pointer"
                        aria-label="Edit playlist"
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePlaylist(playlist.id)}
                        className="text-red-500 hover:text-red-700 cursor-pointer"
                        aria-label="Archive playlist"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="font-heading font-bold text-xl text-gray-900">
                {selectedPlaylist?.name || "Select a playlist"}
              </h2>
              <p className="text-sm text-gray-500 font-body">
                Click an item to set it as now playing.
              </p>
            </div>
          </div>

          {selectedPlaylist ? (
            <>
              <div className="mb-5 space-y-3">
                <div className="relative">
                  <div className="flex flex-col md:flex-row gap-2">
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && !isSearching && searchItunes()
                      }
                      className="flex-1 border border-gray-300 p-2 rounded-md font-body text-gray-900 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="Search iTunes to add a song..."
                    />
                    <button
                      type="button"
                      disabled={isSearching}
                      onClick={searchItunes}
                      className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-md font-body font-semibold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      <FiSearch />
                      {isSearching ? "Searching..." : "Search"}
                    </button>
                  </div>

                  {showSearchResults && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-72 overflow-y-auto">
                      {isSearching ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          Searching...
                        </div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((item) => (
                          <button
                            key={item.trackId}
                            type="button"
                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 text-left"
                            onClick={() => selectItunesResult(item)}
                          >
                            <img
                              src={coverFor(item.artworkUrl)}
                              alt={item.title}
                              className="w-11 h-11 rounded object-cover bg-gray-100 flex-shrink-0"
                            />
                            <span className="flex-1 min-w-0">
                              <span className="block font-semibold text-sm text-gray-900 truncate">
                                {item.title}
                              </span>
                              <span className="block text-xs text-gray-500 truncate">
                                {item.artist}
                                {item.album ? ` - ${item.album}` : ""}
                              </span>
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No results found
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[52px_1fr_1fr_auto] gap-3">
                  <div className="w-[52px] h-[52px] rounded-md bg-gray-100 overflow-hidden flex items-center justify-center">
                    {newItem.coverImage ? (
                      <img
                        src={coverFor(newItem.coverImage)}
                        alt={newItem.title || "Selected cover"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FiMusic className="text-gray-400" />
                    )}
                  </div>
                  <input
                    value={newItem.title}
                    onChange={(e) =>
                      setNewItem((prev) => ({ ...prev, title: e.target.value }))
                    }
                    className="border border-gray-300 p-2 rounded-md font-body text-gray-900 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Song title"
                  />
                  <input
                    value={newItem.artist}
                    onChange={(e) =>
                      setNewItem((prev) => ({ ...prev, artist: e.target.value }))
                    }
                    className="border border-gray-300 p-2 rounded-md font-body text-gray-900 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Artist"
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={addItem}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-body font-semibold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <FiPlus />
                    Add
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {selectedPlaylist.items?.length ? (
                  selectedPlaylist.items.map((item, index) => {
                    const isCurrent =
                      nowPlaying?.isActive && nowPlaying?.itemId === item.id;
                    const isEditing = editingItemId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`border rounded-lg p-4 ${
                          isCurrent
                            ? "border-red-500 bg-red-50"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        {isEditing ? (
                          <div className="grid grid-cols-1 md:grid-cols-[52px_1fr_1fr_auto_auto] gap-3">
                            <div className="w-[52px] h-[52px] rounded-md bg-gray-100 overflow-hidden flex items-center justify-center">
                              {editingItem.coverImage ? (
                                <img
                                  src={coverFor(editingItem.coverImage)}
                                  alt={editingItem.title || "Cover"}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <FiMusic className="text-gray-400" />
                              )}
                            </div>
                            <input
                              value={editingItem.title}
                              onChange={(e) =>
                                setEditingItem((prev) => ({
                                  ...prev,
                                  title: e.target.value,
                                }))
                              }
                              className="border border-gray-300 p-2 rounded-md text-gray-900 bg-white"
                            />
                            <input
                              value={editingItem.artist}
                              onChange={(e) =>
                                setEditingItem((prev) => ({
                                  ...prev,
                                  artist: e.target.value,
                                }))
                              }
                              className="border border-gray-300 p-2 rounded-md text-gray-900 bg-white"
                            />
                            <button
                              type="button"
                              onClick={updateItem}
                              className="text-green-600 hover:text-green-800 cursor-pointer flex items-center gap-1"
                            >
                              <FiSave />
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingItemId("")}
                              className="text-gray-500 hover:text-gray-900 cursor-pointer flex items-center gap-1"
                            >
                              <FiX />
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col md:flex-row md:items-center gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                runNowPlayingAction(
                                  { action: "set-item", itemId: item.id },
                                  "Now playing updated.",
                                )
                              }
                              className="flex items-center gap-3 text-left flex-1 min-w-0 cursor-pointer"
                            >
                              <span className="font-mono text-sm text-gray-400 w-8">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <span className="w-11 h-11 rounded-md bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {item.coverImage ? (
                                  <img
                                    src={coverFor(item.coverImage)}
                                    alt={item.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <FiMusic />
                                )}
                              </span>
                              <span className="min-w-0">
                                <span className="block font-heading font-bold text-gray-900 truncate">
                                  {item.title}
                                </span>
                                <span className="block text-sm text-gray-500 truncate">
                                  {item.artist}
                                </span>
                              </span>
                            </button>

                            <div className="flex items-center gap-2 md:flex-shrink-0">
                              <button
                                type="button"
                                disabled={index === 0 || saving}
                                onClick={() => moveItem(item.id, "up")}
                                className="p-2 text-gray-500 hover:text-gray-900 disabled:opacity-30 cursor-pointer"
                                aria-label="Move item up"
                              >
                                <FiArrowUp />
                              </button>
                              <button
                                type="button"
                                disabled={
                                  index === selectedPlaylist.items.length - 1 ||
                                  saving
                                }
                                onClick={() => moveItem(item.id, "down")}
                                className="p-2 text-gray-500 hover:text-gray-900 disabled:opacity-30 cursor-pointer"
                                aria-label="Move item down"
                              >
                                <FiArrowDown />
                              </button>
                              <button
                                type="button"
                                onClick={() => startEditItem(item)}
                                className="p-2 text-gray-500 hover:text-gray-900 cursor-pointer"
                                aria-label="Edit item"
                              >
                                <FiEdit2 />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteItem(item.id)}
                                className="p-2 text-red-500 hover:text-red-700 cursor-pointer"
                                aria-label="Delete item"
                              >
                                <FiTrash2 />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-500 font-body py-8 text-center">
                    This playlist has no items yet.
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500 font-body py-8 text-center">
              Create a playlist to start managing now playing.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
