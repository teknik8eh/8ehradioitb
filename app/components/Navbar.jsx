"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NavbarAudio from "./navbar/NavbarAudio";
import NavbarMobile from "./navbar/NavbarMobile";
import NavbarDesktop from "./navbar/NavbarDesktop";

export default function Navbar() {
  const router = useRouter();
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navbarRef = useRef(null);
  const [onAir, setOnAir] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [playerTitle, setPlayerTitle] = useState("");

  const handleDropdown = (dropdownName) => {
    setOpenDropdown((prev) => (prev === dropdownName ? null : dropdownName));
  };

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen((prev) => !prev);
    setOpenDropdown(null);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target)) {
        setOpenDropdown(null);
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    fetch("/api/stream-config")
      .then((res) => res.json())
      .then((data) =>
        setOnAir(typeof data?.onAir === "boolean" ? data.onAir : true),
      );
  }, []);

  useEffect(() => {
    fetch("/api/player-config")
      .then((res) => res.json())
      .then((data) => setPlayerTitle(data?.title || ""));
  }, []);

  const discoverLinks = (
    <>
      <Link
        href="/programs"
        className="block px-4 py-2 text-gray-700 hover:bg-gray-100 font-body text-base"
      >
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 flex items-center justify-center">
            <Image
              src="/radio-icon.svg"
              alt="Podcast"
              width={20}
              height={20}
              style={{ position: "relative", top: "0.5px" }}
            />
          </div>
          Programs
        </div>
      </Link>
      <Link
        href="/about-us"
        className="block px-4 py-2 text-gray-700 hover:bg-gray-100 font-body text-base"
      >
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 flex items-center justify-center">
            <Image
              src="/aboutus-icon.svg"
              alt="About Us"
              width={18}
              height={18}
              style={{ position: "relative", top: "1px" }}
            />
          </div>
          About Us
        </div>
      </Link>
      <Link
        href="/faq"
        className="block px-4 py-2 text-gray-700 hover:bg-gray-100 font-body text-base"
      >
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 flex items-center justify-center">
            <Image
              src="/faq-icon.svg"
              alt="FAQ"
              width={22}
              height={22}
              style={{ position: "relative", top: "1px" }}
            />
          </div>
          FAQ
        </div>
      </Link>
    </>
  );

  const partnershipLinks = (
    <>
      <Link
        href="/media-partner"
        className="block px-4 py-2 text-gray-700 hover:bg-gray-100 font-body text-base"
      >
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 flex items-center justify-center">
            <Image
              src="/medpart-icon.svg"
              alt="Media Partner"
              width={22}
              height={22}
              style={{ position: "relative", top: "1px" }}
            />
          </div>
          Media Partner
        </div>
      </Link>
      <Link
        href="/agency"
        className="block px-4 py-2 text-gray-700 hover:bg-gray-100 font-body text-base"
      >
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 flex items-center justify-center">
            <Image
              src="/agency-icon.svg"
              alt="Agency"
              width={22}
              height={22}
              style={{ position: "relative", top: "1px" }}
            />
          </div>
          Agency
        </div>
      </Link>
    </>
  );

  return (
    <header className="bg-white border-b border-gray-100" ref={navbarRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo + Mobile Play Button + On Air Mobile */}
          <div className="flex items-center space-x-3">
            <Image
              src="/8eh.png"
              alt="8EH Logo"
              width={61}
              height={61}
              className="cursor-pointer"
              onClick={() => router.push("/")}
              priority
            />

            <NavbarAudio variant="mobile" onAir={onAir} />

            {onAir && (
              <span className="flex items-center gap-1 font-body">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-red-600 text-sm font-semibold ml-1">
                  On Air
                </span>
              </span>
            )}
          </div>

          <NavbarDesktop
            openDropdown={openDropdown}
            onDropdownToggle={handleDropdown}
            discoverLinks={discoverLinks}
            partnershipLinks={partnershipLinks}
          />

          <NavbarAudio variant="desktop" onAir={onAir} />

          <div className="md:hidden">
            <button
              onClick={handleMobileMenuToggle}
              className="text-gray-900 hover:text-[#D83232] transition-colors"
            >
              <svg
                className="h-6 w-6 cursor-pointer"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      <NavbarMobile
        isOpen={isMobileMenuOpen}
        openDropdown={openDropdown}
        onDropdownToggle={handleDropdown}
        discoverLinks={discoverLinks}
        partnershipLinks={partnershipLinks}
      />
    </header>
  );
}
