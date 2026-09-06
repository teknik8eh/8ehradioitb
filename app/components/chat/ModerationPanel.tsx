'use client';

import { ActiveGuest } from '../../hooks/useLiveChat';

interface ModerationPanelProps {
  activeGuests: ActiveGuest[];
  onMuteGuest: (sessionId: string, action: 'mute' | 'unmute') => void;
  onClose: () => void;
}

export default function ModerationPanel({ activeGuests, onMuteGuest, onClose }: ModerationPanelProps) {
  return (
    <div className="font-plus-jakarta-sans absolute inset-0 z-40 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <p className="text-sm font-bold text-gray-900">Moderasi Chat</p>
          <p className="mt-0.5 text-[11px] text-gray-400">Kelola peserta di ruang obrolan</p>
        </div>
        <button 
          onClick={onClose}
           className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Guest count */}
      <div className="text-xs text-gray-500 px-5 py-3 flex justify-between border-b border-gray-100">
        <span className="font-medium">Peserta aktif</span>
        <span className="font-semibold text-[#D83232] bg-[#D83232]/10 px-2.5 py-1 rounded">{activeGuests.length}</span>
      </div>

      {/* Guest list */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {activeGuests.length === 0 ? (
          <div className="mt-10 text-center">
            <p className="text-sm font-semibold text-gray-600">Belum ada peserta</p>
            <p className="mt-1 text-xs text-gray-400">Peserta yang masuk akan muncul di sini.</p>
          </div>
        ) : (
            activeGuests.map((guest) => (
            <div 
              key={guest.sessionId}
              className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100"
            >
              <div className="truncate pr-2">
                <p className="text-sm text-gray-800 font-semibold truncate">{guest.name}</p>
                  <p className="text-[10px] text-gray-400 truncate" title={guest.sessionId}>
                  {guest.sessionId.slice(0, 8)}...
                </p>
                {guest.isMuted && (
                  <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-[#D83232] font-medium"><span aria-hidden="true">●</span> Tidak dapat mengirim</span>
                )}
              </div>

              {guest.isMuted ? (
                <button
                  onClick={() => onMuteGuest(guest.sessionId, 'unmute')}
                   className="px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap border border-green-200"
                >
                  Unmute
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (confirm(`Mute ${guest.name}?`)) onMuteGuest(guest.sessionId, 'mute');
                  }}
                   className="px-3 py-1.5 bg-[#D83232]/10 text-[#D83232] hover:bg-[#D83232]/15 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap border border-[#D83232]/20"
                >
                  Mute
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
