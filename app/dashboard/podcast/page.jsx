'use client';

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { FiPlus, FiEdit, FiTrash2, FiSave, FiX } from 'react-icons/fi';
import { hasAnyRole } from '@/lib/roleUtils';

function PodcastDashboard() {
  const { data: session, status } = useSession(); 
  const [podcasts, setPodcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", subtitle: "", description: "", date: "", duration: "", audio: null, coverImage: null, image: "" });
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const isAdmin =
    session && hasAnyRole(session.user.role, ["DEVELOPER", "MUSIC", "TECHNIC"]);

  useEffect(() => {
    if (isAdmin) {
      fetch("/api/podcast")
        .then((res) => res.json())
        .then((data) => { setPodcasts(data); setLoading(false); })
        .catch(() => { setError("Failed to load podcasts"); setLoading(false); });
    }
  }, [isAdmin]);


  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const uploadToR2 = async (file, type) => {
    const res = await fetch("/api/podcast/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        type,
      }),
    });
    if (!res.ok) throw new Error(`Failed to get upload URL for ${type}`);
    const { uploadUrl, key } = await res.json();
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!uploadRes.ok) throw new Error(`Direct upload to R2 failed for ${type}`);
    return key;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      let audioKey = null;
      let coverImageKey = null;
      if (form.audio) {
        audioKey = await uploadToR2(form.audio, "audio");
      }
      if (form.coverImage) {
        coverImageKey = await uploadToR2(form.coverImage, "cover");
      }
      const res = await fetch("/api/podcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          subtitle: form.subtitle,
          description: form.description,
          date: form.date,
          duration: form.duration,
          image: form.image,
          audioKey,
          coverImageKey,
        }),
      });
      if (!res.ok) throw new Error("Failed to add podcast");
      const newPodcast = await res.json();
      setPodcasts((prev) => [newPodcast, ...prev]);
      setForm({ title: "", subtitle: "", description: "", date: "", duration: "", audio: null, coverImage: null, image: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (podcast) => {
    setEditId(podcast.id);
    setEditForm({
      title: podcast.title || "",
      subtitle: podcast.subtitle || "",
      description: podcast.description || "",
      date: podcast.date || "",
      duration: podcast.duration || "",
      image: podcast.image || "",
    });
  };

  const handleEditSave = async (id) => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/podcast", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...editForm }),
      });
      if (!res.ok) throw new Error("Failed to update podcast");
      const updated = await res.json();
      setPodcasts((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setEditId(null);
      setEditForm({});
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this podcast?")) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/podcast", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to delete podcast");
      setPodcasts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return <div className="p-8 text-center font-body">Loading...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-red-500 font-body">
        Access Denied.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-heading font-bold mb-6 text-gray-900">Podcast Dashboard</h1>
      
      {isAdmin && (
        <form onSubmit={handleSubmit} className="mb-8 space-y-6 bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-200">
          <h2 className="text-xl font-heading font-semibold mb-6 text-gray-800">Add New Podcast</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-semibold font-body text-gray-800 mb-2">Title</label>
              <input 
                name="title" 
                value={form.title} 
                onChange={handleChange} 
                className="w-full border border-gray-300 p-3 rounded-lg font-body text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                required 
              />
            </div>
            <div>
              <label className="block font-semibold font-body text-gray-800 mb-2">Subtitle (optional)</label>
              <input 
                name="subtitle" 
                value={form.subtitle} 
                onChange={handleChange} 
                className="w-full border border-gray-300 p-3 rounded-lg font-body text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold font-body text-gray-800 mb-2">Description</label>
              <textarea 
                name="description" 
                value={form.description} 
                onChange={handleChange} 
                rows="4"
                className="w-full border border-gray-300 p-3 rounded-lg font-body text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                required 
              />
            </div>
            <div>
              <label className="block font-semibold font-body text-gray-800 mb-2">Date (e.g. Dec 7, 2024)</label>
              <input 
                name="date" 
                value={form.date} 
                onChange={handleChange} 
                className="w-full border border-gray-300 p-3 rounded-lg font-body text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
              />
            </div>
            <div>
              <label className="block font-semibold font-body text-gray-800 mb-2">Duration (e.g. 33 min 40 sec)</label>
              <input 
                name="duration" 
                value={form.duration} 
                onChange={handleChange} 
                className="w-full border border-gray-300 p-3 rounded-lg font-body text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold font-body text-gray-800 mb-2">Image URL (optional, overrides cover image)</label>
              <input 
                name="image" 
                value={form.image} 
                onChange={handleChange} 
                className="w-full border border-gray-300 p-3 rounded-lg font-body text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
              />
            </div>
            <div>
              <label className="block font-semibold font-body text-gray-800 mb-2">Audio File</label>
              <input 
                name="audio" 
                type="file" 
                accept="audio/*" 
                onChange={handleChange} 
                className="w-full border border-gray-300 p-3 rounded-lg font-body text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors file:mr-2 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-gray-100 hover:file:bg-gray-200" 
                required 
              />
            </div>
            <div>
              <label className="block font-semibold font-body text-gray-800 mb-2">Cover Image (optional)</label>
              <input 
                name="coverImage" 
                type="file" 
                accept="image/*" 
                onChange={handleChange} 
                className="w-full border border-gray-300 p-3 rounded-lg font-body text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors file:mr-2 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-gray-100 hover:file:bg-gray-200" 
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-body font-semibold transition-colors duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer" 
            disabled={submitting}
          >
            <FiPlus size={18} />
            {submitting ? "Adding..." : "Add Podcast"}
          </button>
          {error && <div className="text-red-700 mt-2 font-body bg-red-50 border border-red-200 p-3 rounded-lg">{error}</div>}
        </form>
      )}

      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-200">
        <h2 className="text-xl font-heading font-semibold mb-6 text-gray-900">All Podcasts</h2>
        {loading ? (
          <div className="text-center font-body text-gray-700 py-8">Loading...</div>
        ) : error ? (
          <div className="text-red-700 font-body bg-red-50 border border-red-200 p-3 rounded-lg">{error}</div>
        ) : (
          <ul className="space-y-6">
            {podcasts.map((podcast) => (
              <li key={podcast.id} className="border border-gray-200 p-6 rounded-lg bg-gray-50 hover:shadow-md transition-shadow">
                {editId === podcast.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input 
                        name="title" 
                        value={editForm.title} 
                        onChange={handleEditChange} 
                        className="w-full border border-gray-300 p-3 rounded-lg font-body text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                      />
                      <input 
                        name="subtitle" 
                        value={editForm.subtitle} 
                        onChange={handleEditChange} 
                        className="w-full border border-gray-300 p-3 rounded-lg font-body text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                      />
                      <div className="md:col-span-2">
                        <textarea 
                          name="description" 
                          value={editForm.description} 
                          onChange={handleEditChange} 
                          rows="3"
                          className="w-full border border-gray-300 p-3 rounded-lg font-body text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                        />
                      </div>
                      <input 
                        name="date" 
                        value={editForm.date} 
                        onChange={handleEditChange} 
                        className="w-full border border-gray-300 p-3 rounded-lg font-body text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                      />
                      <input 
                        name="duration" 
                        value={editForm.duration} 
                        onChange={handleEditChange} 
                        className="w-full border border-gray-300 p-3 rounded-lg font-body text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                      />
                      <div className="md:col-span-2">
                        <input 
                          name="image" 
                          value={editForm.image} 
                          onChange={handleEditChange} 
                          className="w-full border border-gray-300 p-3 rounded-lg font-body text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button 
                        onClick={() => handleEditSave(podcast.id)} 
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-body font-semibold transition-colors duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" 
                        disabled={submitting}
                      >
                        <FiSave size={16} />
                        Save
                      </button>
                      <button 
                        onClick={() => setEditId(null)} 
                        className="flex items-center gap-2 bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg font-body font-semibold transition-colors duration-200 shadow-sm"
                      >
                        <FiX size={16} />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="font-heading font-bold text-lg text-gray-900 mb-2">{podcast.title}</div>
                        {podcast.subtitle && (
                          <div className="font-body text-gray-600 mb-2">{podcast.subtitle}</div>
                        )}
                        <div className="font-body text-gray-700 mb-3">{podcast.description}</div>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-2 ml-4">
                          <button 
                            onClick={() => handleEdit(podcast)} 
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                            title="Edit"
                          >
                            <FiEdit size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(podcast.id)} 
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed" 
                            disabled={submitting}
                            title="Delete"
                          >
                            <FiTrash2 size={18} />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="">
                      {(podcast.image || podcast.coverImage || "/8eh-real.svg") && (
                        <img 
                          src={podcast.image || podcast.coverImage || "/8eh-real.svg"} 
                          alt="cover" 
                          className="w-48 h-48 object-cover rounded-lg border border-gray-200 shadow-sm" 
                        />
                      )}
                      <div className="space-y-3 mt-4">
                        <audio 
                          controls 
                          src={podcast.audioUrl ? `/api/proxy-audio?key=${encodeURIComponent(podcast.audioUrl)}` : undefined} 
                          className="w-full rounded-lg" 
                        />
                        <div className="font-body text-sm text-gray-500">
                          By {podcast.author?.name || "Unknown"}
                        </div>
                        {podcast.date && (
                          <div className="font-body text-sm text-gray-500">
                            Published: {podcast.date}
                          </div>
                        )}
                        {podcast.duration && (
                          <div className="font-body text-sm text-gray-500">
                            Duration: {podcast.duration}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default PodcastDashboard;