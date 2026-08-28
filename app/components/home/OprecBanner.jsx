"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import ButtonPrimary from "@/app/components/ButtonPrimary";

// ponytail: hardcoded targets for oprec 2026. Update these dates for next year's oprec.
const OPEN_DATE = new Date("2026-08-30T07:00:00+07:00");
const CLOSE_DATE = new Date("2026-09-06T23:59:00+07:00");
const FORM_URL = "https://8eh.link/join";

function getTimeLeft(targetDate, now) {
  const diff = targetDate.getTime() - now;
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function getOprecState() {
  const now = Date.now();

  if (now < OPEN_DATE.getTime()) {
    return { status: "before", timeLeft: getTimeLeft(OPEN_DATE, now) };
  }

  if (now < CLOSE_DATE.getTime()) {
    return { status: "open", timeLeft: getTimeLeft(CLOSE_DATE, now) };
  }

  return { status: "closed", timeLeft: null };
}

function TimeBox({ value, label }) {
  return (
    <div className="flex flex-col items-center bg-[#FDFBF6] border border-gray-200 rounded-3xl shadow-lg shadow-black/1 px-4 py-4 sm:px-5 min-w-[76px] sm:min-w-[96px]">
      <span className="font-accent text-2xl sm:text-5xl font-bold text-[#D83232] tabular-nums">
        {String(value).padStart(2, "0")}
      </span>
      <span className="font-body text-xs text-gray-500 uppercase mt-2">
        {label}
      </span>
    </div>
  );
}

export default function OprecBanner() {
  const [oprecState, setOprecState] = useState(getOprecState());
  const isOpen = oprecState.status === "open";

  useEffect(() => {
    const id = setInterval(() => setOprecState(getOprecState()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative py-28 my-4 bg-white text-gray-800 overflow-hidden">
      {/* Decorative vstock ornaments */}
      <Image
        src="/vstock-agency-3.png"
        alt=""
        width={200}
        height={200}
        aria-hidden="true"
        className="absolute top-8 left-4 md:left-16 w-20 md:w-32 opacity-80 -rotate-12 pointer-events-none select-none z-0"
      />
      <Image
        src="/vstock-2.png"
        alt=""
        width={300}
        height={300}
        aria-hidden="true"
        className="absolute -bottom-6 -left-6 w-28 md:w-44 opacity-70 pointer-events-none select-none z-0"
      />
      <Image
        src="/vstock-programs-1.png"
        alt=""
        width={300}
        height={300}
        aria-hidden="true"
        className="absolute top-1/2 -right-6 md:right-0 w-24 md:w-40 opacity-70 rotate-180 pointer-events-none select-none z-0"
      />
      <Image
        src="/vstock-agency-3.png"
        alt=""
        width={200}
        height={200}
        aria-hidden="true"
        className="absolute top-10 right-1/8 w-14 md:w-20 opacity-60 rotate-45 pointer-events-none select-none z-0"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <span className="font-body text-sm font-medium text-[#EA4A30] uppercase tracking-relaxed mb-3 block">
          Regenerasi 8EH Radio ITB 2026
        </span>
        <h2 className="font-accent text-5xl sm:text-7xl text-gray-800 font-bold mb-3">
          Are You The Next{" "}
          <span className="underline decoration-gray-700 decoration-4 underline-offset-8 text-[#D83232]">
            Kru
          </span>
          ??
        </h2>
        <p className="font-body text-md text-gray-600 mb-10 max-w-xl mx-auto">
          {oprecState.status === "before"
            ? "Regenerasi 8EH Radio ITB 2026 segera dibuka. Siapkan dirimu untuk bergabung!"
            : oprecState.status === "open"
              ? "Pendaftaran dibuka sampai 6 September 2026 pukul 23.59 WIB."
              : "Pendaftaran Regenerasi 8EH Radio ITB 2026 sudah ditutup."}
        </p>

        {oprecState.timeLeft ? (
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-10">
            <TimeBox value={oprecState.timeLeft.days} label="Hari" />
            <span className="font-accent text-3xl sm:text-4xl font-bold text-gray-300 pb-5">
              :
            </span>
            <TimeBox value={oprecState.timeLeft.hours} label="Jam" />
            <span className="font-accent text-3xl sm:text-4xl font-bold text-gray-300 pb-5">
              :
            </span>
            <TimeBox value={oprecState.timeLeft.minutes} label="Menit" />
            <span className="font-accent text-3xl sm:text-4xl font-bold text-gray-300 pb-5">
              :
            </span>
            <TimeBox value={oprecState.timeLeft.seconds} label="Detik" />
          </div>
        ) : (
          <p className="font-accent text-3xl sm:text-4xl text-[#D83232] font-bold mb-10">
            Pendaftaran Ditutup
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {isOpen ? (
            <a
              href={FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Daftar Oprec Kru 8EH Radio ITB 2026"
            >
              <ButtonPrimary className="!bg-[#EA4A30] !text-white hover:!bg-[#D0402A] !px-8 !py-3 shadow-lg shadow-black/20 hover:scale-[1.03] transition-transform">
                Daftar Sekarang
              </ButtonPrimary>
            </a>
          ) : (
            <ButtonPrimary
              disabled
              aria-disabled="true"
              aria-label={
                oprecState.status === "before"
                  ? "Pendaftaran belum dibuka"
                  : "Pendaftaran sudah ditutup"
              }
              className="!bg-gray-300 !text-gray-500 !px-8 !py-3 shadow-none cursor-not-allowed hover:!bg-gray-300"
            >
              Daftar Sekarang
            </ButtonPrimary>
          )}

          <div className="flex items-center gap-3">
            <a
              href="https://instagram.com/8ehradioitb"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#FDFBF6] border border-gray-200 hover:bg-white rounded-full px-5 py-3 shadow-sm transition-colors"
              aria-label="Follow 8EH Radio ITB on Instagram"
            >
              <Image src="/Instagram.svg" alt="" width={18} height={18} />
              <span className="font-body font-medium text-sm text-gray-800">
                @8ehradioitb
              </span>
            </a>
            <a
              href="https://instagram.com/regenerasi8eh/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#FDFBF6] border border-gray-200 hover:bg-white rounded-full px-5 py-3 shadow-sm transition-colors"
              aria-label="Follow Regenerasi 8EH on Instagram"
            >
              <Image src="/Instagram.svg" alt="" width={18} height={18} />
              <span className="font-body font-medium text-sm text-gray-800">
                @regenerasi8eh
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
