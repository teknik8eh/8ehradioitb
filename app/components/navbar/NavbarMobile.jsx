import React from "react";
import Link from "next/link";

export default function NavbarMobile({
  isOpen,
  openDropdown,
  onDropdownToggle,
  discoverLinks,
  partnershipLinks,
}) {
  if (!isOpen) return null;

  return (
    <div className="md:hidden bg-white border-t border-gray-200">
      <nav className="flex flex-col px-4 pt-2 pb-4">
        <Link
          href="/"
          className="px-3 py-3 text-gray-900 hover:text-[#D83232] hover:bg-gray-100 rounded-md font-medium text-base font-body transition-colors"
        >
          Home
        </Link>
        <Link
          href="/podcast"
          className="px-3 py-3 text-gray-900 hover:text-[#D83232] hover:bg-gray-100 rounded-md font-medium text-base font-body transition-colors"
        >
          Podcast
        </Link>
        <Link
          href="/blog"
          className="px-3 py-3 text-gray-900 hover:text-[#D83232] hover:bg-gray-100 rounded-md font-medium text-base font-body transition-colors"
        >
          Blog
        </Link>

        {/* Discover Dropdown for Mobile */}
        <div>
          <button
            onClick={() => onDropdownToggle("discover")}
            className="w-full flex justify-between items-center px-3 py-3 text-gray-900 hover:text-[#D83232] hover:bg-gray-100 rounded-md font-medium text-base text-left font-body transition-colors"
          >
            <span>Discover</span>
            <svg
              className={`h-5 w-5 transition-transform ${
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
            className={`pl-4 mt-2 space-y-1 ${
              openDropdown === "discover" ? "block" : "hidden"
            }`}
          >
            {discoverLinks}
          </div>
        </div>

        {/* Partnership Dropdown for Mobile */}
        <div>
          <button
            onClick={() => onDropdownToggle("partnership")}
            className="w-full flex justify-between items-center px-3 py-3 text-gray-900 hover:text-[#D83232] hover:bg-gray-100 rounded-md font-medium text-base text-left font-body transition-colors"
          >
            <span>Partnership</span>
            <svg
              className={`h-5 w-5 transition-transform ${
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
            className={`pl-4 mt-2 space-y-1 ${
              openDropdown === "partnership" ? "block" : "hidden"
            }`}
          >
            {partnershipLinks}
          </div>
        </div>
      </nav>
    </div>
  );
}
