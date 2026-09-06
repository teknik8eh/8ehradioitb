"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  FiBarChart2,
  FiCheckSquare,
  FiChevronLeft,
  FiChevronRight,
  FiClipboard,
  FiDatabase,
  FiEdit,
  FiHome,
  FiLink,
  FiLogOut,
  FiMessageCircle,
  FiMic,
  FiMusic,
  FiRadio,
  FiServer,
  FiSettings,
  FiUsers,
  FiVideo,
} from "react-icons/fi";
import { hasAnyRole } from "@/lib/roleUtils";

const navItems = [
  { href: "/dashboard", label: "Home", icon: FiHome, section: "Main", roles: ["MUSIC", "DEVELOPER", "TECHNIC", "REPORTER", "KRU"] },
  { href: "/dashboard/blog", label: "Blog", icon: FiEdit, section: "Content", roles: ["DEVELOPER", "REPORTER"] },
  { href: "/dashboard/podcast", label: "Podcast", icon: FiMic, section: "Content", roles: ["DEVELOPER", "MUSIC"] },
  { href: "/dashboard/program-videos", label: "Program Videos", icon: FiVideo, section: "Content", roles: ["DEVELOPER", "TECHNIC"] },
  { href: "/dashboard/links", label: "Links & QR Codes", icon: FiLink, section: "Tools", roles: ["MUSIC", "DEVELOPER", "TECHNIC", "REPORTER", "KRU"] },
  { href: "/dashboard/forms", label: "Forms", icon: FiClipboard, section: "Tools", roles: ["MUSIC", "DEVELOPER", "TECHNIC", "REPORTER", "KRU", "DATA"] },
  { href: "/dashboard/song-requests", label: "Song Requests", icon: FiMusic, section: "Radio", roles: ["MUSIC", "DEVELOPER", "TECHNIC"], showPendingBadge: true },
  { href: "/dashboard/now-playing", label: "Now Playing", icon: FiRadio, section: "Radio", roles: ["MUSIC", "DEVELOPER"] },
  { href: "/dashboard/tune-tracker", label: "Tune Tracker", icon: FiMusic, section: "Radio", roles: ["MUSIC", "DEVELOPER"] },
  { href: "/dashboard/player-config", label: "Player Config", icon: FiBarChart2, section: "Radio", roles: ["DEVELOPER", "TECHNIC"] },
  { href: "/dashboard/stream-config", label: "Stream Config", icon: FiSettings, section: "Radio", roles: ["DEVELOPER", "TECHNIC"] },
  { href: "/dashboard/live-chat", label: "Live Chat", icon: FiMessageCircle, section: "Technic", roles: ["DEVELOPER", "TECHNIC"] },
  { href: "/dashboard/broadcast-server", label: "Broadcast Control", icon: FiServer, section: "Technic", roles: ["DEVELOPER", "TECHNIC"] },
  { href: "/dashboard/live-stream", label: "Live Stream Control", icon: FiServer, section: "Technic", roles: ["DEVELOPER", "TECHNIC"] },
  { href: "/dashboard/profile-catalog", label: "Profile Fields", icon: FiCheckSquare, section: "Data", roles: ["DEVELOPER", "DATA"] },
  { href: "/dashboard/kru-database", label: "Kru Database", icon: FiDatabase, section: "Data", roles: ["DEVELOPER", "DATA"] },
  { href: "/dashboard/users", label: "Users", icon: FiUsers, section: "Admin", roles: ["DEVELOPER"] },
  { href: "/dashboard/whitelist", label: "Whitelist", icon: FiCheckSquare, section: "Admin", roles: ["DEVELOPER"] },
];

const sectionOrder = ["Main", "Content", "Tools", "Radio", "Technic", "Data", "Admin"];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isExpanded, setIsExpanded] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!hasAnyRole(session?.user?.role, ["MUSIC", "DEVELOPER", "TECHNIC"])) {
      return;
    }

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
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, [session?.user?.role]);

  const visibleNavItems = navItems.filter((item) =>
    hasAnyRole(session?.user?.role, item.roles),
  );

  const groupedItems = sectionOrder
    .map((section) => ({
      section,
      items: visibleNavItems.filter((item) => item.section === section),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside className={`h-full max-h-screen min-h-0 flex flex-col bg-white shadow-lg transition-all duration-300 ease-in-out ${isExpanded ? "w-72 lg:w-64" : "w-20"}`}>
      <div className={`flex-shrink-0 flex items-center p-4 border-b border-gray-200 ${isExpanded ? "justify-between" : "justify-center"}`}>
        {isExpanded && (
          <Link href="/dashboard">
            <Image src="/8eh-real-long.png" alt="8EH Logo" width={100} height={40} />
          </Link>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
          type="button"
        >
          {isExpanded ? <FiChevronLeft size={20} /> : <FiChevronRight size={20} />}
        </button>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-4 px-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        <div className="space-y-5 pb-4">
          {groupedItems.map(({ section, items }) => (
            <div key={section} className="space-y-1">
              {isExpanded && (
                <p className="px-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                  {section}
                </p>
              )}
              {items.map(({ href, label, icon: Icon, showPendingBadge }) => {
                const isActive =
                  pathname === href ||
                  (href !== "/dashboard" && pathname.startsWith(href));
                const showBadge = showPendingBadge && pendingCount > 0;

                return (
                  <Link
                    key={href}
                    href={href}
                    title={label}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-sm ${
                      isActive
                        ? "bg-red-500 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100"
                    } ${!isExpanded ? "justify-center" : ""}`}
                  >
                    <div className="relative flex-shrink-0">
                      <Icon size={19} />
                      {showBadge && !isExpanded && (
                        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                          {pendingCount > 9 ? "9+" : pendingCount}
                        </span>
                      )}
                    </div>
                    {isExpanded && (
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <span className="font-body font-medium truncate">
                          {label}
                        </span>
                        {showBadge && (
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2 ${
                            isActive ? "bg-white text-red-500" : "bg-red-500 text-white"
                          }`}>
                            {pendingCount > 9 ? "9+" : pendingCount}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </nav>

      <div className="flex-shrink-0 px-3 py-3 border-t border-gray-200 bg-white">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer text-sm ${!isExpanded ? "justify-center" : ""}`}
          type="button"
        >
          <FiLogOut size={20} />
          {isExpanded && <span className="font-body font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
