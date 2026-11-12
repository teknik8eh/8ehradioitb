"use client";

import { useState } from "react";
import Image from "next/image";
import boardData from "@/public/data/management-board.json";
import { getAssetUrl } from "@/lib/audioUtils";

function countMembers(node) {
  return 1 + (node.children || []).reduce((sum, c) => sum + countMembers(c), 0);
}

// Flatten a branch into its people, depth-first (director first, then reports)
function flattenPeople(node, out = []) {
  out.push(node);
  for (const child of node.children || []) flattenPeople(child, out);
  return out;
}

function SocialIcons({ ig, linkedin, size = 18 }) {
  return (
    <div className="flex space-x-3">
      {(linkedin && (
        <a
          href={linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="w-5 h-5"
        >
          <Image src="/LinkedIn.svg" alt="LinkedIn" width={size} height={size} />
        </a>
      )) || (
        <div className="opacity-30">
          <Image src="/LinkedIn.svg" alt="LinkedIn" width={size} height={size} />
        </div>
      )}
      {(ig && (
        <a
          href={`https://instagram.com/${ig}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-5 h-5"
        >
          <Image src="/Instagram.svg" alt="Instagram" width={size} height={size} />
        </a>
      )) || (
        <div className="opacity-30">
          <Image src="/Instagram.svg" alt="Instagram" width={size} height={size} />
        </div>
      )}
    </div>
  );
}

function PersonCard({ person, isHead }) {
  const photoUrl = getAssetUrl(person.photo) || "/8eh-real.svg";
  return (
    <div
      className={`flex flex-col items-center text-center bg-white rounded-2xl drop-shadow-md overflow-hidden ${
        isHead ? "border border-red-200" : "border border-gray-300"
      }`}
    >
      <div className="w-full h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
        <Image
          src={photoUrl}
          alt={`Photo of ${person.name}`}
          width={300}
          height={160}
          className="object-cover w-full h-full"
        />
      </div>
      <div className="flex flex-col items-center px-3 py-3">
        <p className="font-heading font-semibold text-base leading-tight text-gray-900">
          {person.name}
        </p>
        <p className="font-body text-xs text-gray-500 leading-tight mt-0.5">
          {person.role}
        </p>
        {person.angkatan && (
          <span className="mt-1.5 px-2 py-0.5 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-100 rounded-full">
            {person.angkatan}
          </span>
        )}
        <div className="mt-2">
          <SocialIcons ig={person.ig} linkedin={person.linkedin} />
        </div>
      </div>
    </div>
  );
}

function GMCard({ gm }) {
  const photoUrl = getAssetUrl(gm.photo) || "/8eh-real.svg";
  return (
    <div className="flex items-center gap-5 bg-white rounded-2xl drop-shadow-md border border-gray-300 p-4 md:p-5">
      <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-gray-100 flex-shrink-0 overflow-hidden">
        <Image
          src={photoUrl}
          alt={`Photo of ${gm.name}`}
          width={128}
          height={128}
          className="object-cover w-full h-full"
        />
      </div>
      <div className="min-w-0">
        <p className="font-body text-xs font-medium uppercase tracking-wide text-gray-400">
          {gm.role}
        </p>
        <p className="font-heading font-bold text-xl md:text-2xl text-gray-900 leading-tight">
          {gm.name}
        </p>
        {gm.angkatan && (
          <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-100 rounded-full">
            {gm.angkatan}
          </span>
        )}
        <div className="mt-2">
          <SocialIcons ig={gm.ig} linkedin={gm.linkedin} size={20} />
        </div>
      </div>
    </div>
  );
}

export default function BoardAccordionMB() {
  const [expandedId, setExpandedId] = useState(null);
  const branches = boardData.children || [];

  return (
    <div className="flex flex-col gap-4">
      <GMCard gm={boardData} />

      {branches.map((branch) => {
        const isOpen = expandedId === branch.id;
        const people = flattenPeople(branch);
        const [head, ...reports] = people;

        return (
          <div
            key={branch.id}
            className="bg-white rounded-2xl drop-shadow-md border border-gray-200 overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(isOpen ? null : branch.id)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-3 px-4 md:px-5 py-4 cursor-pointer hover:bg-red-50/40 transition-colors"
            >
              <p className="font-heading font-semibold text-base md:text-lg text-red-600 text-left">
                {branch.role}
              </p>
              <span className="flex items-center gap-3 flex-shrink-0">
                <span className="font-body text-xs text-gray-400">
                  {countMembers(branch)} orang
                </span>
                <svg
                  className={`w-4 h-4 text-red-600 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
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
              </span>
            </button>

            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            >
              <div className="overflow-hidden">
                <div className="border-t border-gray-100 px-4 md:px-5 pb-5 pt-5">
                  <PersonCard person={head} isHead />
                  {reports.length > 0 && (
                    <>
                      <p className="font-body text-xs font-medium uppercase tracking-wide text-gray-400 mt-5 mb-3">
                        Anggota
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {reports.map((p) => (
                          <PersonCard key={p.id} person={p} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
