'use client';

import { useState } from 'react';
import ButtonPrimary from '../ButtonPrimary';

interface GuestNameModalProps {
  onSaveName: (name: string) => void;
}

export default function GuestNameModal(props: GuestNameModalProps) {
  const onSaveName = props.onSaveName;
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Nama tidak boleh kosong');
      return;
    }

    if (trimmedName.length < 2 || trimmedName.length > 30) {
      setError('Nama panggilan minimal 2 dan maksimal 30 karakter');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/live-chat/guest-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nickname: trimmedName }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Gagal masuk ke chat');
        return;
      }

      const data = await response.json();

      // Berhasil
      sessionStorage.setItem('guest_name', trimmedName);
      localStorage.setItem('guest_name', trimmedName); // Sinkronisasi dengan localStorage
      localStorage.setItem('chat_session_id', data.sessionId); // Simpan sessionId untuk pengecekan mute client-side
      onSaveName(trimmedName);
    } catch (err) {
      setError('Terjadi kesalahan koneksi ke server');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 px-4 backdrop-blur-sm">
      <div className="font-plus-jakarta-sans w-full max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl shadow-gray-900/15">
        <div className="h-1.5 w-full bg-[#D83232]" />
        <div className="p-7">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
            Selamat Datang di Live Chat
          </h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            Masukkan nama panggilan kamu untuk mulai ngobrol
          </p>

          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="Contoh: Andi"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-400 outline-none focus:border-[#D83232] focus:ring-4 focus:ring-[#D83232]/10 transition-all"
              autoFocus
              maxLength={30}
              disabled={loading}
            />

            {error && (
              <p className="mt-2 text-sm text-[#D83232]">{error}</p>
            )}

            <ButtonPrimary
              type="submit"
              disabled={loading}
              className="!mt-4 !w-full !rounded-lg !px-4 !py-3 !font-plus-jakarta-sans disabled:opacity-50"
            >
              {loading ? 'Menghubungkan...' : 'Masuk ke Chat'}
            </ButtonPrimary>
          </form>
        </div>
      </div>
    </div>
  );
}
