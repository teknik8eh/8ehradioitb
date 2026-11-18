"use client";
import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { useRef, useState } from "react";
import "swiper/css";
import Navbar from "../components/Navbar";
import FooterSection from "../components/FooterSection";
import useSWR from "swr";
import ProgramsSlider from "../components/ProgramsSlider";

const fetcher = (url) => fetch(url).then((res) => res.json());

const programs = [
  {
    logo: "/ctrl-logo.png", 
    title: "CTRL: Coba Tanya Radio Lo!",
    description:
      "Kampus Mania bingung mau nanya siapa? Tenang, sekarang CTRL hadir untuk mencari jawaban dari segala kebingungan Kampus Mania!",
    link: "/programs",
  },
  {
    logo: "/gws-logo.png", 
    title: "GWS: Gather With Us",
    description: "Kali ini 8EH Radio ITB kembali dengan podcast yang super seru, GWS! Bukan get well soon, tapi Gather With Us.",
    link: "/programs",
  },
  {
    logo: "/logo-wave.webp", 
    title: "WAVE: What's Around Vibes n Everything",
    description: "Kampus Mania lagi merasa fomo? Tenang, WAVE disini untuk update semua yang lagi hype!",
    link: "/programs",
  },
  {  
    logo: "/logo-kiskaskus.webp", 
    title: "KisKasKus: Kisah Kasih Kampus",
    description: "Mau ngerasain kisah cinta kampus? Dengerin KisKasKus biar tau realitanya!",
    link: "/programs",
  },
  {
    logo: "/logo-okb.webp", 
    title: "OKB: Obrolan Kalcer ITB",
    description: "Mau dengerin obrolan kalcer abiez? OKB siap menemani kampus mania masuk obrolan GONG seputar ITB.",
    link: "/programs",
  },
  {
    logo: "/logo-kelam.webp", 
    title: "KELAM: Kelana Malam",
    description: "Siap bikin bulu kuduk berdiri, KELAM mengajak Kampus Mania berkelana menelusuri jejak budaya horor Indonesia.",
    link: "/programs",
  },
  {
    logo: "/logo-onair.webp", 
    title: "ONAIR: Obrolan Nada & Irama",
    description: "Ingin tahu apa aja sih yang sering terjadi di musik global sekarang? Yuk kupas tuntas di ONAIR!",
    link: "/programs",
  },
];


const highlightsData = [
  {
    imageUrl: "/highlight-2.png",
    altText: "Highlight Program Dulu vs Sekarang",
    link: "https://www.instagram.com/p/DKCKgOjyM9p/",
  },
  {
    imageUrl: "/highlight-1.jpg",
    altText: "Highlight Program Coba Tanya Radio Lo!",
    link: "https://www.instagram.com/p/DL4t269Jt-B/",
  },
  {
    imageUrl: "/highlight-3.jpg",
    altText: "Highlight Program Kumal",
    link: "https://www.instagram.com/p/DMKN7O0pgbx/",
  },
];
const ProgramHero = () => {
  return (
    <section className="relative py-16 overflow-hidden">
      <div className="absolute top-1/4 right-0 w-40 md:w-80 opacity-30">
        <Image
          src="/vstock-programs-2.png"
          alt="Decorative Checkmark"
          width={600}
          height={600}
          className=""
        />
      </div>
      <div className="absolute top-1/4 right-0 w-30 md:w-60 opacity-30">
        <Image
          src="/vstock-programs-3.png"
          alt="Decorative Checkmark"
          width={600}
          height={600}
          className=""
        />
      </div>
      <div className="absolute top-5/8 left-0 w-40 md:w-60 opacity-70">
        <Image
          src="/vstock-programs-4.png"
          alt="Decorative Checkmark"
          width={600}
          height={600}
          className=""
        />
      </div>
      <div className="absolute top-11/16 left-0 w-30 md:w-50 opacity-70">
        <Image
          src="/vstock-programs-5.png"
          alt="Decorative Checkmark"
          width={600}
          height={600}
          className=""
        />
      </div>

      <ProgramsSlider
        title="Our Programs"
        subtitle="Explore 8EH Radio ITB"
        programs={programs}
      />
    </section>
  );
};

const PodcastSection = () => {
  const scrollContainerRef = useRef(null);

  const { data: videos, isLoading } = useSWR("/api/program-videos", fetcher);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const { current } = scrollContainerRef;
      const scrollAmount = current.offsetWidth; // Scroll by the container width
      current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute top-0 md:top-1/16 right-0 w-40 md:w-60 opacity-70">
        <Image
          src="/vstock-programs-6.png"
          alt="Decorative Checkmark"
          width={600}
          height={600}
          className=""
        />
      </div>
      <div className="absolute top-0 -translate-y-1/8 right-0 w-40 md:w-60 opacity-100">
        <Image
          src="/vstock-programs-7.png"
          alt="Decorative Checkmark"
          width={600}
          height={600}
          className=""
        />
      </div>
      <div className="absolute top-1/4 left-0 w-40 md:w-60 opacity-70">
        <Image
          src="/vstock-programs-8.png"
          alt="Decorative Checkmark"
          width={600}
          height={600}
          className=""
        />
      </div>
      <div className="absolute top-1/4 left-0 w-40 md:w-80 opacity-70">
        <Image
          src="/vstock-programs-9.png"
          alt="Decorative Checkmark"
          width={600}
          height={600}
          className=""
        />
      </div>
      <div className="absolute top-1/2 right-0 w-60 h-60 opacity-100">
        <Image
          src="/vstock-programs-10.png"
          alt="Decorative Checkmark"
          width={600}
          height={600}
          className=""
        />
      </div>
      <div className="absolute top-1/2 right-0 w-60 h-60 opacity-100">
        <Image
          src="/vstock-programs-11.png"
          alt="Decorative Checkmark"
          width={600}
          height={600}
          className=""
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-12 sm:px-16 lg:px-24">
        <div className="flex justify-between items-center mb-12">
          <div className="text-center">
            <h3 className="font-accent text-4xl sm:text-5xl md:text-5xl lg:text-6xl text-gray-900">
              Discover Our Exciting <br />
              Programs at 8EH Radio ITB
            </h3>
          </div>
          {/* Slider Controls */}
          <div className="hidden md:flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={() => scroll("left")}
              className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-white/70 backdrop-blur-sm hover:bg-white/100 hover:border-gray-300 transition-all duration-200 flex items-center justify-center border border-gray-200/80 shadow-md hover:shadow-lg cursor-pointer"
              aria-label="Scroll left"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 sm:h-6 sm:w-6 text-gray-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={() => scroll("right")}
              className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-white/70 backdrop-blur-sm hover:bg-white/100 hover:border-gray-300 transition-all duration-200 flex items-center justify-center border border-gray-200/80 shadow-md hover:shadow-lg cursor-pointer"
              aria-label="Scroll right"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 sm:h-6 sm:w-6 text-gray-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Horizontal scroll container */}
        <div
          ref={scrollContainerRef}
          className="flex font-body flex-wrap md:flex-nowrap overflow-x-auto scroll-smooth space-x-6 pb-4 -mx-4 px-8 -my-4 py-8 snap-x snap-mandatory hide-scrollbar bg-gradient-to-b from-white/60 to-yellow-300/30 rounded-4xl backdrop-blur-xs transition-all duration-300 border hover:border-gray-300 border-gray-200/80"
        >
          {isLoading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="flex-shrink-0 w-full md:w-[calc(33.9%-1.125rem)] snap-center animate-pulse"
              >
                <div className="w-full h-48 rounded-2xl mb-4 bg-gray-200" />
                <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto" />
              </div>
            ))
          ) : videos && videos.length > 0 ? (
            videos.map((prog, idx) => (
              <div
                key={idx}
                className="flex-shrink-0 w-full md:w-[calc(33.9%-1.125rem)] snap-center group"
              >
                <div className="relative w-full h-48 sm:h-48 rounded-2xl mb-4 bg-gray-200/80 overflow-hidden transition-all duration-300 group-hover:scale-105">
                  <Image
                    src={prog.thumbnail}
                    alt={prog.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="text-center px-2 justify-center">
                  <h4 className="font-heading text-xl font-semibold text-gray-800 mb-1">
                    {prog.title}
                  </h4>
                  <p className="font-body text-sm text-gray-500">
                    <Link
                      href={prog.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-600 hover:text-red-800 my-4 font-semibold justify-center text-sm flex items-center"
                    >
                      Watch
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 ml-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Link>
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 -translate-y-1.5">
              No videos available.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

const HighlightsSection = () => {
  return (
    // Latar belakang gelap untuk menonjolkan kartu
    <section className="relative bg-[url('/highlights-bg.png')] bg-cover bg-center bg-no-repeat py-20">
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-white"></div>

      <div className="relative container mx-auto px-12">
        {/* Judul "Program Highlights" */}
        <div className="flex justify-center mb-12">
          <h2 className=" backdrop-blur-xs drop-shadow-md from-yellow-500/80 via-orange-400/70 to-white/60 text-white text-center font-accent text-4xl lg:text-5xl px-4 py-3 rounded-3xl shadow-lg">
            Featured Programs
          </h2>
        </div>

        {/* Grid untuk Kartu Highlight */}
        <div className="flex flex-wrap justify-center gap-8">
          {highlightsData.map((highlight, index) => (
            <a
              key={index}
              href={highlight.link}
              rel="noopener noreferrer"
              target="_blank"
              className="group block transform transition-transform duration-300 ease-in-out hover:scale-105"
            >
              <Image
                src={highlight.imageUrl}
                alt={highlight.altText}
                width={500}
                height={500}
                className="w-50 md:w-70 h-60 md:h-90 object-cover rounded-2xl shadow-lg group-hover:shadow-yellow-400/30 group-hover:shadow-2xl drop-shadow-xl/30 transition-all"
              />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

const YoutubeCTA = () => {
  return (
    // Section wrapper untuk memberikan spasi atas dan bawah
    <section className="relative py-16">
      <div className="absolute top-0 left-0 w-30 h-30 opacity-70">
        <Image
          src="/vstock-programs-12.png"
          alt="Decorative Checkmark"
          width={600}
          height={600}
          className=""
        />
      </div>
      <div className="absolute top-1/2 right-0 w-30 h-30 opacity-70">
        <Image
          src="/vstock-programs-13.png"
          alt="Decorative Checkmark"
          width={600}
          height={600}
          className=""
        />
      </div>
      {/* Container utama yang mengatur layout dan styling */}
      <div className="flex flex-col md:flex-row items-center justify-between mx-8 md:mx-24 rounded-4xl bg-gradient-to-br from-white/70 to-yellow-300/30 backdrop-blur-sm py-8 px-8 transition-all duration-300 border  border-gray-200/50">
        {/* Sisi Kiri: Teks Ajakan */}
        <div className="text-center md:text-left mb-6 md:mb-0">
          <h2 className="text-4xl md:text-6xl font-semibold md:font-normal font-accent text-gray-800 mb-1">
            Join Us on Youtube
          </h2>
          <p className="text-gray-600 max-w-md font-body mt-4">
            Nikmati konten-konten seru dari 8EH Radio ITB pada Youtube kami!
          </p>
        </div>

        {/* Sisi Kanan: Tombol YouTube */}
        <a
          href="https://www.youtube.com/@8EHRadioITB" // Ganti dengan URL kanal YouTube Anda
          target="_blank"
          rel="noopener noreferrer"
        >
          {/* Logo di dalam tombol */}
          <div className="mr-3">
            <Image
              src="/youtube.png" // Sediakan gambar logo ini di folder /public/images
              alt="8EH Radio ITB Logo"
              width={300}
              height={300}
              className="rounded-4xl"
            />
          </div>
        </a>
      </div>
    </section>
  );
};

export default function Home() {
  return (
    <main className="bg-[#FEFBF8] overflow-x-hidden font-sans">
      <Navbar />
      <ProgramHero />
      <PodcastSection />
      <HighlightsSection />
      <YoutubeCTA />
      <FooterSection />
    </main>
  );
}
