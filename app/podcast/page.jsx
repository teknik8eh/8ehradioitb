"use client"; // Diperlukan karena slider menggunakan state dan event browser
import Navbar from "../components/Navbar";
import FooterSection from "../components/FooterSection";
import Image from "next/image";
import Link from "next/link";
import ButtonPrimary from "../components/ButtonPrimary";
import { Swiper, SwiperSlide } from "swiper/react";
import SwiperCore, { Navigation, Pagination } from "swiper";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { useEffect, useState } from "react";
import GlobalAudioPlayer from "../components/GlobalAudioPlayer";
import PodcastAudioPlayer from "../components/PodcastAudioPlayer";
import ProgramsSlider from "../components/ProgramsSlider";

const programs = [
  {
    logo: "/ctrl-logo.png", // Logo dari gambar
    title: "CTRL: Coba Tanya Radio Lo!",
    description:
      "Kampus Mania bingung mau nanya siapa? Tenang, sekarang CTRL hadir untuk mencari jawaban dari segala kebingungan Kampus Mania!",
    link: "/programs/gws",
  },
  {
    logo: "/gws-logo.png", // Contoh program lain
    title: "GWS: Gather With Us",
    description:
      "Kali ini 8EH Radio ITB kembali dengan podcast yang super seru, GWS! Bukan get well soon, tapi Gather With Us.",
    link: "/programs/on-air",
  },
];

const PodcastHero = () => {
  return (
    // Section utama dengan padding, latar belakang, dan positioning relatif untuk elemen dekoratif
    <section className="relative w-full bg-[#FDFBF8] py-24 px-4 sm:px-8 lg:px-36 overflow-hidden">
      {/* Elemen Dekoratif di Latar Belakang */}
      <div className="absolute inset-0 z-0">
        {/* Bentuk Abstrak/Halftone */}
        <Image
          src="/vstock-podcast-1.png" // Sediakan gambar ini di folder public
          alt="Abstract Shape"
          width={100}
          height={100}
          className="absolute top-0 md:top-1/3 left-0 opacity-70 w-20 z-1"
        />
        <Image
          src="/vstock-podcast-2.png" // Sediakan gambar ini di folder public
          alt="Abstract Shape"
          width={100}
          height={100}
          className="absolute top-[5%] md:top-[8%] right-0 translate-x-10 md:translate-x-0 md:left-1/3 opacity-70 z-1"
        />
        <Image
          src="/vstock-podcast-5.png" // Sediakan gambar ini di folder public
          alt="Abstract Shape"
          width={200}
          height={200}
          className="absolute bottom-[10%] md:top-[10%] right-0 opacity-90 z-1 translate-x-[10%] md:translate-x-20 w-30 md:w-50"
        />
        <Image
          src="/vstock-podcast-6.png" // Sediakan gambar ini di folder public
          alt="Abstract Shape"
          width={200}
          height={200}
          className="absolute top-0 md:top-[5%] left-0 -translate-x-[30%] md:translate-x-0 opacity-80 w-70 z-0"
        />
        <Image
          src="/vstock-podcast-7.png" // Sediakan gambar ini di folder public
          alt="Abstract Shape"
          width={200}
          height={200}
          className="absolute top-[40%] md:top-[3%] translate-x-[40%] md:translate-x-0 right-[3%] opacity-90 w-150 z-0"
        />
        <Image
          src="/vstock-podcast-8.png" // Sediakan gambar ini di folder public
          alt="Abstract Shape"
          width={200}
          height={200}
          className="absolute top-[40%] md:top-[5%] right-0 opacity-90 w-70 md:w-100 translate-x-[50%] md:translate-x-0 z-0"
        />
      </div>

      {/* Kontainer Konten Utama */}
      <div className="relative z-20 flex flex-col md:flex-row items-center justify-between px-4 max-w-7xl mx-auto">
        {/* Sisi Kiri: Teks & Tombol */}
        <div className="md:w-1/2 text-start mb-12 md:mb-0">
          <h1 className="font-accent text-6xl md:text-8xl font-medium text-gray-800 mb-6">
            Our Podcasts
          </h1>
          <p className="text-lg text-gray-600 max-w-md mx-auto md:mx-0 mb-8">
            Rasakan serunya podcast 8EH, tempat di mana diskusi seru dan cerita menghibur hadir untukmu! Yuk, jelajahi kehidupan kampus yang dikemas dengan gaya khas kami yang penuh warna dan energi!
          </p>
          <ButtonPrimary
            className="!bg-[#EFEAE6]/80 !text-[#444] hover:!bg-[#E5DED8] !px-8 !py-3"
            onClick={() => {
              const element = document.getElementById("podcast-programs");
              if (element) {
                element.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }
            }}
          >
            Explore
          </ButtonPrimary>
        </div>

        {/* Sisi Kanan: Gambar Player */}
        <div className="relative md:w-1/2 flex justify-center md:justify-end -mt-10 md:-mt-20">
          <div className="relative w-[500px] h-[500px]">
            {/* Gambar Frame Player PNG */}
            <Image
              src="/player-podcast.png" // Path ke PNG player
              alt="Modern podcast player with earbuds"
              layout="fill"
              objectFit="contain"
              className="z-0 drop-shadow-2xl"
            />
            <div className="absolute z-10 rotate-12 bottom-[16%] left-[42.5%]">
              {/* <button
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("triggerPlayerControl"))
                }
                className="w-13 h-13 rounded-full bg-white hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0 border border-gray-200/90 shadow-md cursor-pointer"
                aria-label={`Play`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 text-gray-700"
                  fill="currentColor"
                >
                  {<path d="M8 5v14l11-7z" />}
                </svg>
              </button> */}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const PODCASTS_PER_PAGE = 3; // Easily change this value to adjust per page

const PodcastEpisodes = () => {
  const [podcasts, setPodcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentPodcast, setCurrentPodcast] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    fetch("/api/podcast")
      .then((res) => res.json())
      .then((data) => {
        setPodcasts(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load podcasts");
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error)
    return <div className="text-center text-red-600 py-8">{error}</div>;

  // Pagination logic
  const totalPages = Math.ceil(podcasts.length / PODCASTS_PER_PAGE);
  const indexOfLast = currentPage * PODCASTS_PER_PAGE;
  const indexOfFirst = indexOfLast - PODCASTS_PER_PAGE;
  const currentPodcasts = podcasts.slice(indexOfFirst, indexOfLast);

  // Fade animation on page change
  const handlePageChange = (newPage) => {
    if (isAnimating || newPage < 1 || newPage > totalPages) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentPage(newPage);
      setIsAnimating(false);
    }, 250); // duration matches transition
  };

  const handlePlayPause = (pod) => {
    if (currentPodcast && currentPodcast.id === pod.id) {
      setIsPlaying((prev) => !prev);
    } else {
      setCurrentPodcast(pod);
      setIsPlaying(true);
    }
  };

  return (
    <section className="pt-24 bg-linear-to-b from-[#FEFBF8] from-0% to-black to-5% md:to-35% text-white relative overflow-hidden" id="podcast-programs">
      <div className="absolute top-0 md:top-1/3 right-0 md:right-0 w-100 md:w-180 opacity-20 -rotate-17">
        <Image
          src="/boombox-podcast.png"
          alt="Decorative Checkmark"
          width={1000}
          height={1000}
          className=""
        />
      </div>
      <div className="absolute bottom-0 md:top-0 left-0 md:-translate-x-20 w-40 md:w-100 opacity-30 rotate-44">
        <Image
          src="/mic-podcast.png"
          alt="Decorative Checkmark"
          width={1000}
          height={1000}
          className=""
        />
      </div>
      <div className="relative z-10 max-w-7xl mx-auto">
        <p className="text-lg font-bold text-gray-100 mx-auto md:mx-0 mb-4 text-center drop-shadow-md">
          Podcasts
        </p>
        <h2 className="text-6xl font-accent text-center mb-12 drop-shadow-md">
          Latest Podcast Episodes
        </h2>
        <div className="bg-white/15 backdrop-blur-sm mb-12 py-4 md:px-12 rounded-4xl px-4 mx-0 md:mx-4 border border-gray-200/20">
          <div
            className={`space-y-4 transition-opacity duration-300 ${isAnimating ? "opacity-0" : "opacity-100"}`}
          >
            {currentPodcasts.map((pod, idx) => {
              const playing =
                currentPodcast && currentPodcast.id === pod.id && isPlaying;
              return (
                <div
                  key={pod.id || idx}
                  className="flex items-start gap-4 sm:gap-6 py-8 border-b border-gray-200/80 last:border-b-0"
                >
                  {/* Image */}
                  <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 relative flex-shrink-0">
                    <img
                      src={pod.image || pod.coverImage || "/8eh-real.svg"}
                      alt="Podcast Thumbnail"
                      className="object-cover rounded-2xl shadow-md w-full h-full"
                    />
                  </div>
                  {/* Details */}
                  <div className="flex-1">
                    <h3 className="font-heading text-lg sm:text-xl text-gray-200 font-bold mb-2">
                      {pod.title}
                    </h3>
                    <p className="font-body text-sm text-gray-300 mb-2">
                      {pod.subtitle}
                    </p>
                    <p className="font-body text-sm text-gray-300 mb-4 leading-relaxed">
                      {pod.description}
                    </p>
                    <div className="flex justify-between items-center mt-4">
                      <p className="font-body text-xs sm:text-sm text-gray-300">
                        {pod.date} &bull; {pod.duration}
                      </p>
                      <ButtonPrimary
                        className="!w-12 !h-12 !p-0 !rounded-full flex items-center justify-center flex-shrink-0"
                        aria-label={playing ? "Pause Podcast" : "Play Podcast"}
                        onClick={() => handlePlayPause(pod)}
                      >
                        {playing ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-white"
                            fill="white"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <rect x="6" y="5" width="4" height="14" />
                            <rect x="14" y="5" width="4" height="14" />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-white"
                            fill="white"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <polygon points="6,4 20,12 6,20" fill="white" />
                          </svg>
                        )}
                      </ButtonPrimary>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Swiper Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center my-12 space-x-4">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200/20"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
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
            <p className="font-semibold text-lg">
              {currentPage}
              <span className="text-white/60 mx-2">/</span>
              {totalPages}
            </p>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200/20"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
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
        )}
      </div>
      {/* Render GlobalAudioPlayer at the bottom, passing podcast info if selected */}
      <PodcastAudioPlayer
        audioUrl={currentPodcast?.audioUrl}
        title={currentPodcast?.title}
        image={
          currentPodcast?.image || currentPodcast?.coverImage || "/8eh-real.svg"
        }
        subtitle={currentPodcast?.subtitle}
        description={currentPodcast?.description}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
      />
    </section>
  );
};

export default function PodcastPage() {
  return (
    <main className="bg-[#FEFBF8] overflow-x-hidden font-body">
      <Navbar />
      <PodcastHero />
      <ProgramsSlider
        title="Podcast Programs"
        subtitle="Explore 8EH Radio ITB"
        programs={programs}
      />
      <PodcastEpisodes />
      <FooterSection />
    </main>
  );
}
