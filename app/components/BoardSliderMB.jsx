"use client";

import { useState } from "react";
import Image from "next/image";
import Head from "next/head";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Grid } from "swiper/modules";
import boardData from "@/public/data/management-board.json";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/grid";
import { getAssetUrl } from "@/lib/audioUtils";

// Flatten a branch depth-first: head first, then reports
function flattenMembers(node, out = []) {
  out.push(node);
  for (const child of node.children || []) flattenMembers(child, out);
  return out;
}

function countMembers(node) {
  return 1 + (node.children || []).reduce((sum, c) => sum + countMembers(c), 0);
}

const branches = boardData.children || [];

// Include GM as a selectable "branch" (its members = the GM alone)
const navItems = [
  {
    id: "gm",
    label: "General Manager",
    members: [
      {
        name: boardData.name,
        role: boardData.role,
        angkatan: boardData.angkatan,
        ig: boardData.ig,
        linkedin: boardData.linkedin,
        photoUrl: getAssetUrl(boardData.photo) || "/foto-announcer/6 - Emir Muhammad.png",
      },
    ],
  },
  ...branches.map((branch) => ({
    id: branch.id,
    label: branch.role.replace(" Director", "").replace(" and ", " & "),
    members: flattenMembers(branch).map((m) => ({
      name: m.name,
      role: m.role,
      angkatan: m.angkatan,
      ig: m.ig,
      linkedin: m.linkedin,
      photoUrl: getAssetUrl(m.photo) || "/foto-announcer/6 - Emir Muhammad.png",
    })),
  })),
];

const branchMembers = {};
for (const item of navItems) {
  branchMembers[item.id] = item.members;
}

// Pill styled after ButtonPrimary (bg #D83232, inset shadows)
const pillShadow = {
  boxShadow: `
    0 1px 2px rgba(2, 8, 11, 0.05),
    inset 0 32px 24px rgba(255, 255, 255, 0.05),
    inset 0 2px 1px rgba(255, 255, 255, 0.25),
    inset 0 0px 0px rgba(2, 8, 11, 0.15),
    inset 0 -2px 1px rgba(0, 0, 0, 0.20)
  `,
};

function BranchPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-4 py-2 rounded-full font-body font-medium text-sm text-white transition-colors cursor-pointer ${
        active
          ? "bg-[#B72929] ring-2 ring-red-300"
          : "bg-[#D83232] hover:bg-[#B72929]"
      }`}
      style={pillShadow}
    >
      {label}
    </button>
  );
}

// Responsive half-lines for the horizontal connector:
// each column draws its center-outward stub only when it is NOT the row edge.
// Rows: base=2 cols, md=3 cols, lg=6 cols.
const lineLeft = [
  "hidden", // 0: row start at every breakpoint
  "block", // 1
  "hidden md:block", // 2: row start on mobile
  "block md:hidden lg:block", // 3: row start on md
  "hidden md:block", // 4: row start on mobile
  "block", // 5
];
const lineRight = [
  "block", // 0
  "hidden md:block", // 1: row end on mobile
  "block md:hidden lg:block", // 2: row end on md
  "hidden md:block", // 3: row end on mobile
  "block", // 4
  "hidden", // 5: row end at every breakpoint
];

function StructureView({ onSelectBranch }) {
  return (
    <div className="flex flex-col items-center py-8">
      {/* GM node */}
      <div className="bg-white rounded-2xl shadow-x text-center">
        <button
                onClick={() => onSelectBranch("gm")}
                className="w-full min-h-[96px] flex flex-col items-center justify-center gap-1 px-3 py-3 bg-[#D83232] hover:bg-[#B72929] rounded-2xl shadow-xs border border-zinc-200 text-center cursor-pointer hover:-translate-y-0.5 hover:border-red-200 transition-all"
              >
        <p className="font-heading font-semibold text-base text-white">
          General Manager
        </p>
        </button>
      </div>

      {/* Vertical line down from GM */}
      <div className="w-px h-6 bg-gray-300" />

      {/* Branch rows — horizontal connector drawn per column (exact at every breakpoint) */}
      <div className="w-full max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6 px-2 md:px-8">
          {branches.map((branch, idx) => (
            <div key={branch.id} className="flex flex-col items-center">
              {/* Column connector: stubs from center; right stub extends across the grid gap */}
              <div className="relative w-full">
                <div
                  className={`absolute top-0 left-0 right-1/2 h-px bg-gray-300 ${lineLeft[idx]}`}
                />
                <div
                  className={`absolute top-0 left-1/2 w-[calc(50%+1rem)] md:w-[calc(50%+1.5rem)] h-px bg-gray-300 ${lineRight[idx]}`}
                />
                <div className="w-px h-6 bg-gray-300 mx-auto" />
              </div>
              <button
                onClick={() => onSelectBranch(branch.id)}
                className="w-full min-h-[96px] flex flex-col items-center justify-center gap-1 px-3 py-3 bg-[#D83232] rounded-2xl shadow-xs border border-zinc-200 text-center cursor-pointer hover:-translate-y-0.5 hover:border-red-200 transition-all"
              >
                <p className="font-heading font-semibold text-[13px] leading-snug text-white">
                  {branch.role}
                </p>
                <svg
                  className="w-3.5 h-3.5 mt-2 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MemberCard({ member, idx }) {
  return (
    <div className="flex flex-col items-center text-center space-y-4 w-40 sm:w-44">
      <div className="w-48 h-56 rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden">
        <Image
          src={member.photoUrl}
          alt={`Photo of ${member.name}`}
          width={144}
          height={144}
          className="object-cover w-full h-full"
          priority={idx < 8}
          loading={idx < 8 ? "eager" : "lazy"}
        />
      </div>
      <div>
        <h3 className="font-heading font-semibold text-lg text-gray-900">
          {member.name}
        </h3>
        <p className="font-body text-sm text-gray-500">{member.role}</p>
        {member.angkatan && (
          <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-body font-semibold shadow-xs text-red-700 border border-red-700 rounded-full">
            {member.angkatan}
          </span>
        )}
      </div>
      <div className="flex space-x-4">
        {(member.linkedin && (
          <a
            href={member.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="w-6 h-6 text-gray-500 hover:text-gray-800 transition-colors"
          >
            <Image src="/LinkedIn.svg" alt="LinkedIn" width={24} height={24} />
          </a>
        )) || (
          <div className="w-6 h-6 opacity-30">
            <Image src="/LinkedIn.svg" alt="LinkedIn" width={24} height={24} />
          </div>
        )}
        {(member.ig && (
          <a
            href={`https://instagram.com/${member.ig}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-6 h-6 text-gray-500 hover:text-gray-800 transition-colors"
          >
            <Image src="/Instagram.svg" alt="Instagram" width={24} height={24} />
          </a>
        )) || (
          <div className="w-6 h-6 opacity-30">
            <Image src="/Instagram.svg" alt="Instagram" width={24} height={24} />
          </div>
        )}
      </div>
    </div>
  );
}

function DetailView({ branchId }) {
  const members = branchMembers[branchId] || [];
  const title = navItems.find((item) => item.id === branchId)?.label;

  return (
    <>
      <Head>
        <link rel="preload" as="image" href="/LinkedIn.svg" />
        <link rel="preload" as="image" href="/Instagram.svg" />
      </Head>
      <div className="mb-6 text-center">
        <h3 className="font-heading font-semibold text-2xl text-gray-900">
          {title}
        </h3>
      </div>

      {members.length <= 20 ? (
        /* Centered flex grid when everything fits on one page */
        <div className="w-full p-6 rounded-2xl">
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-10">
            {members.map((member, idx) => (
              <MemberCard key={idx} member={member} idx={idx} />
            ))}
          </div>
        </div>
      ) : (
        <Swiper
          modules={[Navigation, Grid]}
          spaceBetween={20}
          slidesPerView={4}
          slidesPerGroup={4}
          grid={{ rows: 2, fill: "row" }}
          navigation
          breakpoints={{
            0: { slidesPerView: 1, grid: { rows: 2 } },
            640: { slidesPerView: 2, grid: { rows: 2 } },
            1024: { slidesPerView: 4, grid: { rows: 2 } },
          }}
          className="board-swiper w-full p-6 rounded-2xl"
        >
        <style jsx global>{`
          .board-swiper .swiper-button-prev,
          .board-swiper .swiper-button-next {
            color: #6b7280;
          }
        `}</style>
        {members.map((member, idx) => (
          <SwiperSlide key={idx} className="pb-8">
            <MemberCard member={member} idx={idx} />
          </SwiperSlide>
        ))}
      </Swiper>
      )}
    </>
  );
}

export default function BoardSliderMB() {
  const [activeBranch, setActiveBranch] = useState(null);

  return (
    <div className="w-full">
      {/* Pill navigation — only visible in detail view */}
      <div
        className={`flex flex-wrap items-center justify-center gap-3 pb-2 transition-all duration-300 ease-in-out ${activeBranch ? "mb-6 opacity-100" : "mb-0 opacity-0 pointer-events-none"}`}
      >
        <div
          className={`flex items-center gap-3 overflow-x-auto transition-all duration-300 ease-in-out ${activeBranch ? "max-w-full opacity-100" : "max-w-0 opacity-0"}`}
        >
          <button
            onClick={() => setActiveBranch(null)}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full font-body font-medium text-sm text-white bg-[#D83232] hover:bg-[#B72929] transition-colors cursor-pointer"
            style={pillShadow}
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Struktur
          </button>
        </div>
        {navItems.map((item) => (
          <BranchPill
            key={item.id}
            label={item.label}
            active={activeBranch === item.id}
            onClick={() => setActiveBranch(item.id)}
          />
        ))}
      </div>

      {/* View container animation */}
      <style jsx global>{`
        @keyframes view-in {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-view-in {
          animation: view-in 0.3s ease-out;
        }
        .board-swiper .swiper-button-prev,
        .board-swiper .swiper-button-next {
          color: #6b7280;
        }
      `}</style>

      {/* View with fade/slide transition on branch switch */}
      <div key={activeBranch ?? "structure"} className="animate-view-in">
        {activeBranch ? (
          <DetailView branchId={activeBranch} />
        ) : (
          <StructureView onSelectBranch={setActiveBranch} />
        )}
      </div>
    </div>
  );
}
