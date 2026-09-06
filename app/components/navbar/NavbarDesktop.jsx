import React from "react";
import Link from "next/link";

export default function NavbarDesktop({
  openDropdown,
  onDropdownToggle,
  discoverLinks,
  partnershipLinks,
}) {
  return (
    <nav className="hidden md:flex items-center space-x-8">
      <Link
        href="/"
        className="text-gray-900 hover:text-[#D83232] font-body font-normal text-base transition-colors"
      >
        Home
      </Link>
      <Link
        href="/podcast"
        className="text-gray-900 hover:text-[#D83232] font-body font-normal text-base transition-colors"
      >
        Podcast
      </Link>
      <Link
        href="/blog"
        className="text-gray-900 hover:text-[#D83232] font-body font-normal text-base transition-colors"
      >
        Blog
      </Link>

      {/* Discover Dropdown */}
      <div className="relative">
        <button
          onClick={() => onDropdownToggle("discover")}
          className="flex items-center text-gray-900 hover:text-[#D83232] font-body font-normal text-base transition-colors"
        >
          Discover
          <svg
            className={`ml-1 h-4 w-4 transition-transform ${
              openDropdown === "discover" ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        <div
          className={`absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50 ${
            openDropdown === "discover" ? "block" : "hidden"
          }`}
        >
          {discoverLinks}
        </div>
      </div>

      {/* Partnership Dropdown */}
      <div className="relative">
        <button
          onClick={() => onDropdownToggle("partnership")}
          className="flex items-center text-gray-900 hover:text-[#D83232] font-body font-normal text-base transition-colors"
        >
          Partnership
          <svg
            className={`ml-1 h-4 w-4 transition-transform ${
              openDropdown === "partnership" ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        <div
          className={`absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50 ${
            openDropdown === "partnership" ? "block" : "hidden"
          }`}
        >
          {partnershipLinks}
        </div>
      </div>
    </nav>
  );
}
