"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import DashboardSidebar from "@/app/components/DashboardSidebar";
import UserDropdown from "@/app/components/UserDropdown";
import { FiMenu } from "react-icons/fi";
import { createDashboardRefresh } from "@/lib/dashboard-refresh";
import { hasAnyRole } from "@/lib/roleUtils";
import { SONG_REQUEST_ADMIN_ROLES, SONG_REQUEST_STATUS_CHANGED } from "@/lib/song-request-admin";

export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { data: session } = useSession();
  const canManageSongRequests = hasAnyRole(session?.user?.role, SONG_REQUEST_ADMIN_ROLES);

  useEffect(() => {
    if (!canManageSongRequests) {
      setPendingCount(0);
      return;
    }

    const refresh = createDashboardRefresh(async (signal) => {
      try {
        const res = await fetch("/api/song-request/pending-count", { signal });
        if (!res.ok) return;
        const { count } = await res.json();
        if (!signal.aborted && Number.isInteger(count) && count >= 0) {
          setPendingCount(count);
        }
      } catch {
        // Keep the last count until the next successful refresh.
      }
    });

    window.addEventListener(SONG_REQUEST_STATUS_CHANGED, refresh.refresh);
    return () => {
      window.removeEventListener(SONG_REQUEST_STATUS_CHANGED, refresh.refresh);
      refresh.dispose();
    };
  }, [canManageSongRequests]);

  return (
    <div className="flex bg-gray-100 h-dvh overflow-hidden font-body">
      {/* Sidebar untuk Desktop */}
      <div className="hidden lg:block h-dvh overflow-hidden">
        <DashboardSidebar pendingCount={pendingCount} />
      </div>

      {/* Sidebar untuk Mobile (Drawer) */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-[70] overflow-hidden"
          onClick={() => setIsSidebarOpen(false)}
        >
          <div
            className="absolute left-0 top-0 h-dvh max-h-dvh overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <DashboardSidebar pendingCount={pendingCount} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="sticky top-0 z-50 flex justify-between lg:justify-end items-center p-4 border-b border-gray-200 bg-white shadow-sm">
          <button
            className="lg:hidden p-2 text-gray-700"
            onClick={() => setIsSidebarOpen(true)}
          >
            <FiMenu size={24} />
          </button>
          <UserDropdown />
        </header>
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          {children}
        </main>
        {/* <footer className="text-xs text-gray-500 font-body text-center py-4">
          © {new Date().getFullYear()} Technic 8EH Radio ITB. All rights
          reserved.
        </footer> */}
      </div>
    </div>
  );
}
