'use client';

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { hasAnyRole } from "@/lib/roleUtils";
import { useState, useEffect } from 'react';
import { FiHome, FiEdit, FiMic, FiLink, FiUsers, FiCheckSquare, FiLogOut, FiSettings, FiBarChart2, FiMusic, FiChevronLeft, FiChevronRight, FiVideo, FiClipboard, FiDatabase } from 'react-icons/fi';
import { MdQueueMusic } from 'react-icons/md';

const navItems = [
  { href: "/dashboard", label: "Home", icon: FiHome, roles: ["MUSIC", "DEVELOPER", "TECHNIC", "REPORTER", "KRU"] },
  { href: "/dashboard/song-requests", label: "Song Requests", icon: MdQueueMusic, roles: ["MUSIC", "DEVELOPER", "TECHNIC"], showPendingBadge: true },
  { href: "/dashboard/blog", label: "Blog", icon: FiEdit, roles: ["DEVELOPER", "REPORTER"] },
  { href: "/dashboard/podcast", label: "Podcast", icon: FiMic, roles: ["DEVELOPER", "MUSIC"] },
  { href: "/dashboard/links", label: "Links & QR Codes", icon: FiLink, roles: ["MUSIC", "DEVELOPER", "TECHNIC", "REPORTER", "KRU"] },
  { href: "/dashboard/forms", label: "Forms", icon: FiClipboard, roles: ["MUSIC", "DEVELOPER", "TECHNIC", "REPORTER", "KRU", "DATA"] },
  { href: "/dashboard/profile-catalog", label: "Profile Fields", icon: FiCheckSquare, roles: ["DEVELOPER", "DATA"] },
  { href: "/dashboard/kru-database", label: "Kru Database", icon: FiDatabase, roles: ["DEVELOPER", "DATA"] },
  { href: "/dashboard/tune-tracker", label: "Tune Tracker", icon: FiMusic, roles: ["MUSIC", "DEVELOPER"] },
  { href: "/dashboard/program-videos", label: "Program Videos", icon: FiVideo, roles: ["DEVELOPER", "TECHNIC"] },
  { href: "/dashboard/player-config", label: "Player Config", icon: FiBarChart2, roles: ["DEVELOPER", "TECHNIC"] },
  { href: "/dashboard/stream-config", label: "Stream Config", icon: FiSettings, roles: ["DEVELOPER", "TECHNIC"] },
  { href: "/dashboard/users", label: "Users", icon: FiUsers, roles: ["DEVELOPER"] },
  { href: "/dashboard/whitelist", label: "Whitelist", icon: FiCheckSquare, roles: ["DEVELOPER"] },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isExpanded, setIsExpanded] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  // Fetch pending song requests count
  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await fetch("/api/song-request?status=PENDING");
        const data = await res.json();
        setPendingCount(data.requests?.length || 0);
      } catch {
        setPendingCount(0);
      }
    };

    fetchPending();
    // Poll setiap 30 detik
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, []);

  const visibleNavItems = navItems.filter(item =>
    hasAnyRole(session?.user?.role, item.roles)
  );

  return (
    <aside className={`h-full flex flex-col bg-white shadow-lg transition-all duration-300 ease-in-out ${isExpanded ? 'w-64' : 'w-20'}`}>
      <div className={`flex items-center p-4 border-b border-gray-200 ${isExpanded ? 'justify-between' : 'justify-center'}`}>
        {isExpanded && (
          <Link href="/dashboard">
            <Image src="/8eh-real-long.png" alt="8EH Logo" width={100} height={40} />
          </Link>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
        >
          {isExpanded ? <FiChevronLeft size={20}/> : <FiChevronRight size={20}/>}
        </button>
      </div>

      <nav className="flex-1 flex flex-col space-y-2 mt-4 px-4">
        {visibleNavItems.map(({ href, label, icon: Icon, showPendingBadge }) => {
          const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          const showBadge = showPendingBadge && pendingCount > 0;

          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`flex items-center space-x-4 p-3 rounded-lg transition-colors cursor-pointer ${
                isActive ? 'bg-red-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
              } ${!isExpanded ? 'justify-center' : ''}`}
            >
              <div className="relative flex-shrink-0">
                <Icon size={20} />
                {/* Badge untuk collapsed sidebar */}
                {showBadge && !isExpanded && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {pendingCount > 9 ? "9+" : pendingCount}
                  </span>
                )}
              </div>
              {isExpanded && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="font-body font-medium truncate">{label}</span>
                  {/* Badge untuk expanded sidebar */}
                  {showBadge && (
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2 ${
                      isActive ? 'bg-white text-red-500' : 'bg-red-500 text-white'
                    }`}>
                      {pendingCount > 9 ? "9+" : pendingCount}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={`px-4 py-4 border-t border-gray-200`}>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className={`w-full flex items-center space-x-4 p-3 rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer ${!isExpanded ? 'justify-center' : ''}`}
        >
          <FiLogOut size={20} />
          {isExpanded && <span className="font-body font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
