"use client";

import { useState } from "react";
import DashboardSidebar from "@/app/components/DashboardSidebar";
import UserDropdown from "@/app/components/UserDropdown";
import { FiMenu } from "react-icons/fi";

export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex bg-gray-100 h-dvh overflow-hidden font-body">
      {/* Sidebar untuk Desktop */}
      <div className="hidden lg:block h-dvh overflow-hidden">
        <DashboardSidebar />
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
            <DashboardSidebar />
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
