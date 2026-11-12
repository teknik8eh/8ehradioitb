"use client";

import Image from "next/image";
import Head from "next/head";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Grid } from "swiper/modules";
import announcerData from "@/public/data/agency.json";
import Waveform from "./Waveform"; // Import the Waveform component
import { getAssetUrl } from "@/lib/audioUtils";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/grid";

// Get announcer members from the JSON data
const allMembers = announcerData.map((announcer) => ({
  name: announcer.name,
  role: "Announcer",
  ig: announcer.ig,
  linkedin: announcer.linkedin,
  photoUrl: getAssetUrl(announcer.photo) || "/placeholder.jpg",
  voiceUrl: getAssetUrl(announcer.voice) || "",
}));

export default function BoardSliderAnnouncerAgency() {
  return (
    <>
      <Head>
        <link rel="preload" as="image" href="/LinkedIn.svg" />
        <link rel="preload" as="image" href="/Instagram.svg" />
        <link rel="preload" as="image" href="/x-logo.svg" />
      </Head>

      <Swiper
        modules={[Navigation, Grid]}
        spaceBetween={20}
        slidesPerView={4}
        slidesPerGroup={1}
        grid={{ rows: 2, fill: "row" }}
        navigation
        breakpoints={{
          0: { slidesPerView: 1, grid: { rows: 1 } },
          640: { slidesPerView: 2, grid: { rows: 1 } },
          1024: { slidesPerView: 4, grid: { rows: 2 } },
        }}
        className="board-swiper w-full p-6 rounded-2xl"
        style={{
          "--swiper-navigation-size": "30px",
        }}
      >
        <style jsx global>{`
          .board-swiper .swiper-button-prev,
          .board-swiper .swiper-button-next {
            color: #6b7280;
          }
        `}</style>
        {allMembers.map((member, idx) => (
          <SwiperSlide key={idx} className="pb-4">
            <div className="flex flex-col items-center text-center space-y-4 bg-white backdrop-blur-sm pb-4 rounded-3xl drop-shadow-md border border-gray-300 min-h-[440px] mx-4 md:mx-0 overflow-hidden">
              <div className="w-full h-48 rounded-t-xl bg-gray-200 flex items-center justify-center overflow-hidden">
                <Image
                  src={member.photoUrl}
                  alt={`Photo of ${member.name}`}
                  width={500}
                  height={500}
                  className="object-cover w-full h-full"
                  priority={idx < 8}
                  loading={idx < 8 ? "eager" : "lazy"}
                />
              </div>

              {/* Waveform component for voice sample */}
              <div className="border-b-1 border-gray-300 pb-4">
                {member.voiceUrl && (
                  <Waveform
                    audioUrl={member.voiceUrl}
                    announcerName={member.name.split(" ")[0]}
                  />
                )}
              </div>

              <div className="flex-grow flex flex-col justify-center">
                <h3 className="font-heading font-semibold text-xl text-gray-900 mt-0">
                  {member.name}
                </h3>
                <p className="font-body text-sm text-gray-500">{member.role}</p>
              </div>

              <div className="flex space-x-4">
                {(member.linkedin && (
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-6 h-6 text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    <Image
                      src="/LinkedIn.svg"
                      alt="LinkedIn"
                      width={24}
                      height={24}
                    />
                  </a>
                )) || (
                  <a
                    rel="noopener noreferrer"
                    className="w-6 h-6 text-gray-500 hover:text-gray-800 transition-colors  opacity-30"
                  >
                    <Image
                      src="/LinkedIn.svg"
                      alt="LinkedIn"
                      width={24}
                      height={24}
                    />
                  </a>
                )}
                {(member.ig && (
                  <a
                    href={`https://instagram.com/${member.ig}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-6 h-6 text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    <Image
                      src="/Instagram.svg"
                      alt="Instagram"
                      width={24}
                      height={24}
                    />
                  </a>
                )) || (
                  <a
                    rel="noopener noreferrer"
                    className="w-6 h-6 text-gray-500 hover:text-gray-800 transition-colors  opacity-30"
                  >
                    <Image
                      src="/Instagram.svg"
                      alt="Instagram"
                      width={24}
                      height={24}
                    />
                  </a>
                )}
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </>
  );
}
