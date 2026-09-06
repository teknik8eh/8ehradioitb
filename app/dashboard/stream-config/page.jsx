"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { FiPlus, FiTrash2, FiSave } from "react-icons/fi";
import { hasAnyRole } from '@/lib/roleUtils';

export default function StreamConfigPage() {
  const { data: session, status } = useSession();
  const [config, setConfig] = useState({
    baseUrls: [],
    defaultUrl: "",
    fallbackUrl: "",
    onAir: false,
    liveChatEnabled: true,
    songRequestEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [newUrl, setNewUrl] = useState("");

  const isAdmin = session && hasAnyRole(session.user.role, ["DEVELOPER", "TECHNIC"]);

  useEffect(() => {
    fetch("/api/stream-config")
      .then((res) => res.json())
      .then((data) => {
        setConfig({
          baseUrls: data?.baseUrls || [],
          defaultUrl: data?.defaultUrl || "",
          fallbackUrl: data?.fallbackUrl || "",
          onAir: typeof data?.onAir === "boolean" ? data.onAir : true,
          liveChatEnabled: data?.liveChatEnabled !== false,
          songRequestEnabled: data?.songRequestEnabled !== false,
        });
      })
      .catch(() => {
        setError("Failed to load configuration. Please try again.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleAddUrl = () => {
    if (newUrl && !config.baseUrls.includes(newUrl)) {
      try {
        // Validate URL format before adding
        new URL(newUrl);
        setConfig((prev) => ({ ...prev, baseUrls: [...prev.baseUrls, newUrl] }));
        setNewUrl("");
        setError("");
      } catch (e) {
        setError("Invalid URL format. Please enter a valid URL.");
      }
    }
  };

  const handleRemoveUrl = (urlToRemove) => {
    setConfig((prev) => ({
      ...prev,
      baseUrls: prev.baseUrls.filter((u) => u !== urlToRemove),
      defaultUrl: prev.defaultUrl === urlToRemove ? "" : prev.defaultUrl,
      fallbackUrl: prev.fallbackUrl === urlToRemove ? "" : prev.fallbackUrl,
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/stream-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Failed to save configuration.");
      setSuccess("Configuration saved successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return <div className="p-8 text-center font-body">Loading...</div>;
  }
  
  if (!isAdmin) {
    return <div className="p-8 text-center font-body text-red-600">Access Denied.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-gray-800">Stream Configuration</h1>
        <p className="text-gray-600 font-body mt-1">Manage live streaming URLs and broadcast status.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-xl shadow-md">
        {/* Base URLs Section */}
        <div>
          <label className="block font-semibold font-body text-gray-700 mb-2">Stream URLs</label>
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="w-full border border-gray-300 p-3 rounded-md font-body text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="https://your-stream-url.com/stream"
            />
            <button
              type="button"
              onClick={handleAddUrl}
              className="flex-shrink-0 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-md font-body font-semibold transition-colors duration-200 shadow-sm cursor-pointer"
            >
              <FiPlus />
              Add
            </button>
          </div>
          <ul className="space-y-2 font-body">
            {config.baseUrls.length > 0 ? config.baseUrls.map((url) => (
              <li key={url} className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-md shadow-sm">
                <span className="flex-1 text-gray-800 text-sm break-all">{url}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveUrl(url)}
                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors cursor-pointer"
                >
                  <FiTrash2 size={16}/>
                </button>
              </li>
            )) : <p className="text-sm text-gray-500 text-center py-4">No URLs added yet.</p>}
          </ul>
        </div>

        {/* Default and Fallback URLs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="defaultUrl" className="block font-semibold font-body text-gray-700 mb-2">Default URL</label>
              <select
                id="defaultUrl"
                name="defaultUrl"
                value={config.defaultUrl}
                onChange={handleChange}
                className="w-full border border-gray-300 p-3 rounded-md font-body text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
              >
                <option value="">Select default stream</option>
                {config.baseUrls.map((url) => (
                  <option key={url} value={url}>{url}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fallbackUrl" className="block font-semibold font-body text-gray-700 mb-2">Fallback URL</label>
              <select
                id="fallbackUrl"
                name="fallbackUrl"
                value={config.fallbackUrl}
                onChange={handleChange}
                className="w-full border border-gray-300 p-3 rounded-md font-body text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
              >
                <option value="">Select fallback stream</option>
                {config.baseUrls.map((url) => (
                  <option key={url} value={url}>{url}</option>
                ))}
              </select>
            </div>
        </div>

        {/* Session Features */}
        <div>
          <label className="block font-semibold font-body text-gray-700 mb-2">Fitur Sesi Siaran</label>
          <div className="space-y-3">
            {[
              ["liveChatEnabled", "Live Chat"],
              ["songRequestEnabled", "Song Request"],
            ].map(([name, label]) => (
              <div key={name} className="flex items-center justify-between gap-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
                <span className="font-body text-gray-700">{label}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!config[name]}
                  onClick={() => handleChange({ target: { name, type: "checkbox", checked: !config[name] } })}
                  className={`relative inline-flex h-7 w-14 items-center cursor-pointer rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 border ${
                    config[name]
                      ? "bg-green-500 border-green-600 focus:ring-green-500"
                      : "bg-gray-300 border-gray-400 focus:ring-gray-400"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-300 ease-in-out ${
                      config[name] ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                  <span className="sr-only">{config[name] ? "Matikan" : "Nyalakan"} {label}</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* On Air Status */}
        <div>
          <label className="block font-semibold font-body text-gray-700 mb-2">Broadcast Status</label>
          <div className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
            <span className="font-body text-gray-700">Radio is currently:</span>
            <button
              type="button"
              role="switch"
              aria-checked={!!config.onAir}
              onClick={() => handleChange({ target: { name: "onAir", type: "checkbox", checked: !config.onAir } })}
              className={`relative inline-flex h-7 w-14 items-center cursor-pointer rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 border ${
                config.onAir
                  ? "bg-green-500 border-green-600 focus:ring-green-500"
                  : "bg-gray-300 border-gray-400 focus:ring-gray-400"
              }`}
            >
              <span
                aria-hidden="true"
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-300 ease-in-out ${
                  config.onAir ? "translate-x-7" : "translate-x-1"
                }`}
              />
              <span className="sr-only">{config.onAir ? "Turn off" : "Turn on"} broadcast</span>
            </button>
            <span
              className={`font-body text-sm font-semibold ${config.onAir ? "text-green-600" : "text-gray-500"}`}
            >
              {config.onAir ? "On Air" : "Off Air"}
            </span>
          </div>
        </div>
        
        {error && <div className="text-red-600 font-body bg-red-50 p-3 rounded-md text-sm">{error}</div>}
        {success && <div className="text-green-600 font-body bg-green-50 p-3 rounded-md text-sm">{success}</div>}
        
        <div className="pt-4">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-body font-semibold transition-colors duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              disabled={saving}
            >
              <FiSave />
              {saving ? "Saving..." : "Save Configuration"}
            </button>
        </div>
      </form>
    </div>
  );
}
