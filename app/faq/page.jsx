"use client"; // Diperlukan karena slider menggunakan state dan event browser
import Navbar from "../components/Navbar";
import FooterSection from "../components/FooterSection";
import Image from "next/image";
import Link from "next/link";
import ButtonPrimary from "../components/ButtonPrimary";
import "swiper/css";
import { useState, useEffect } from "react";

const faqData = [
  {
    question: "Apa itu 8EH Radio?",
    answer:
      "8EH Radio ITB adalah radio mahasiswa resmi di Institut Teknologi Bandung. Kami menyediakan platform  untuk hiburan, informasi, dan kreativitas. Program kami meliputi siaran langsung, acara musik, dan podcast.",
  },
  {
    question: "Gimana cara mendengarkannya?",
    answer:
      "Kamu bisa mendengarkan 8EH Radio lewat website kami. Nikmati siaran live yang seru dan podcast on-demand kapan pun kamu mau! Stay tune untuk update terbaru dan konten menarik lainnya.",
  },
  {
    question: "Program apa saja yang ditawarkan?",
    answer:
      "Kami hadir dengan beragam program seru mulai dari siaran live interaktif, event musik seperti Jamgazm, hingga pengembangan talenta lewat 8EH Agency. Semua konten kami dirancang untuk menghibur dan melibatkan kamu sebagai pendengar setia. Yuk, cek jadwal lengkapnya dan temukan program favoritmu!",
  },
  {
    question: "Gimana cara kolaborasi bisnis?",
    answer:
      "Bisnis kamu bisa berkolaborasi dengan 8EH Radio ITB lewat iklan, sponsor, atau kemitraan event. Kami siap memberikan solusi yang sesuai dengan kebutuhan marketingmu. Hubungi tim kami sekarang untuk informasi lebih lanjut.",
  },
  {
    question: "Dimana kami bisa menghubungi kalian?",
    answer:
      "Kamu bisa menghubungi kami lewat email—kami siap menjawab segala pertanyaanmu. Jangan ragu untuk menyapa, kami selalu terbuka untukmu!",
  },
];

// --- Sub-komponen untuk setiap item FAQ ---
const FaqItem = ({ faq, isOpen, onToggle }) => {
  return (
    <div className="border-b border-orange-200/50 py-4">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-end">
          <div className="[letter-spacing:3px]">
            <span className="mr-4 font-bold text-xl font-accent text-red-600">
              Q:
            </span>
          </div>
          <span className="font-bold text-gray-800">{faq.question}</span>
        </div>
        <div
          className={`transform transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        >
          <svg
            className="h-5 w-5 text-gray-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Konten Jawaban dengan animasi collapse */}
      <div
        className={`overflow-hidden transition-[max-height] duration-500 ease-in-out`}
        style={{ maxHeight: isOpen ? "200px" : "0px" }} // Set max-height yang cukup
      >
        <div className="mt-2 flex items-start text-gray-800">
          <div className="[letter-spacing:4px]">
            <span className="mr-4 font-bold text-xl font-accent text-red-600">
              A:
            </span>
          </div>
          <span className="font-normal font-body text-gray-800">
            {faq.answer}
          </span>
        </div>
      </div>
    </div>
  );
};

const FAQHero = () => {
  return (
    // Section utama dengan padding, latar belakang, dan positioning relatif untuk elemen dekoratif
    <section className="relative w-full bg-gradient-to-b from-white via-yellow-200/90 to-white py-24 px-4 sm:px-8 lg:px-36 overflow-hidden">
      {/* Elemen Dekoratif di Latar Belakang */}
      <div className="absolute inset-0 z-0">
        {/* Bentuk Abstrak/Halftone */}
        <Image
          src="/vstock-podcast-6.png" 
          alt="Abstract Shape"
          width={200}
          height={200}
          className="absolute top-0 md:top-[20%] left-0 -translate-x-[30%] md:translate-x-0 opacity w-70 z-0"
        />
        <Image
          src="/vstock-podcast-7.png" 
          alt="Abstract Shape"
          width={200}
          height={200}
          className="absolute top-[40%] md:top-[3%] translate-x-[40%] md:translate-x-0 right-[3%] opacity-90 w-100 z-0"
        />
      </div>

      {/* Kontainer Konten Utama */}
      <div className="relative z-20 flex flex-col md:flex-row items-center justify-between px-4 w-full">
        {/* Sisi Kiri: Teks & Tombol */}
        <div className="text-start mb-12 md:mb-0">
          <h1 className="font-accent text-6xl md:text-7xl font-medium text-gray-800 mb-6">
            Your Questions Answered
          </h1>
          <p className="text-md font-body text-gray-800 mx-auto md:mx-0 mb-8">
            Punya pertanyaan seputar 8EH Radio ITB? Jelajahi halaman FAQ kami dan temukan jawabannya.
          </p>
        </div>

        {/* Sisi Kanan: Gambar Player */}
        <div className="relative flex justify-center -mr-[10%] -mt-10 md:-mt-20">
          <div className="relative w-100 md:w-140">
            {/* Gambar Frame Player PNG */}
            <Image
              src="/mail-faq.png" // Path ke PNG player
              alt="Modern podcast player with earbuds"
              width={500}
              height={300}
              className="z-0 drop-shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

// --- Komponen Utama FAQ ---
const FaqSection = () => {
  // --- PERUBAHAN STATE ACCORDION ---
  // Menggunakan array untuk menyimpan semua indeks yang terbuka
  const [openIndices, setOpenIndices] = useState([]); // Buka item pertama secara default

  const handleToggle = (clickedIndex) => {
    // Cek apakah indeks sudah ada di dalam array
    if (openIndices.includes(clickedIndex)) {
      // Jika sudah ada, hapus dari array (menutup accordion)
      setOpenIndices(openIndices.filter((i) => i !== clickedIndex));
    } else {
      // Jika belum ada, tambahkan ke array (membuka accordion)
      setOpenIndices([...openIndices, clickedIndex]);
    }
  };

  // --- LOGIKA PAGINASI (tetap sama) ---
  const [currentPage, setCurrentPage] = useState(1);
  const faqsPerPage = 5;
  const [isAnimating, setIsAnimating] = useState(false);

  const totalPages = Math.ceil(faqData.length / faqsPerPage);
  const indexOfLastFaq = currentPage * faqsPerPage;
  const indexOfFirstFaq = indexOfLastFaq - faqsPerPage;
  const currentFaqs = faqData.slice(indexOfFirstFaq, indexOfLastFaq);

  const handlePageChange = (newPage) => {
    if (isAnimating || newPage < 1 || newPage > totalPages) return;

    setIsAnimating(true);
    setTimeout(() => {
      setCurrentPage(newPage);
      setOpenIndices([]); // Reset accordion, buka item pertama di halaman baru
      setIsAnimating(false);
    }, 300);
  };

  return (
    <section className="relative bg-white py-24 px-4">
      {/* Gambar Dekoratif */}
      <div className="absolute top-0 left-0 w-40 md:w-64 opacity-70 md:opacity-100 -translate-x-1/4">
        <Image
          src="/vstock-medpart-2.png"
          alt="decoration"
          width={300}
          height={300}
        />
      </div>
      <div className="absolute top-2/3 right-0 w-60 md:w-96 rotate-180 translate-x-1/4">
        <Image src="/vstock-3.png" alt="decoration" width={400} height={400} />
      </div>
      <div className="absolute top-0 right-0 w-60 md:w-96 opacity-70 translate-x-1/4">
        <Image
          src="/vstock-podcast-8.png"
          alt="decoration"
          width={400}
          height={400}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <h2 className="text-6xl font-accent text-gray-800">FAQs</h2>
        <p className="mt-4 text-gray-800 font-body">
          Temukan jawaban atas pertanyaan seputar 8EH Radio ITB
        </p>
      </div>

      {/* Kontainer Utama FAQ dengan Paginasi */}
      <div className="relative z-10 mx-auto mt-12 max-w-4xl rounded-4xl bg-gradient-to-t from-[#FEF9E7] to-[#F5E6A3] border border-zinc-200 p-6 shadow-md backdrop-blur-sm sm:px-10 py-6">
        {/* Wrapper untuk animasi fade */}
        <div
          className={`transition-opacity duration-300 ${
            isAnimating ? "opacity-0" : "opacity-100"
          }`}
        >
          {currentFaqs.map((faq, index) => (
            <FaqItem
              key={index}
              faq={faq}
              // --- PERUBAHAN LOGIKA PENGECEKAN & PENGATURAN ---
              isOpen={openIndices.includes(index)}
              onToggle={() => handleToggle(index)}
            />
          ))}
        </div>

        {/* Kontrol Paginasi */}
        {/* <div className="mt-8 flex items-center justify-center space-x-4">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || isAnimating}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/50 shadow-md transition hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-400/60"
          >
            <svg
              className="h-5 w-5 text-black"
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
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || isAnimating}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/50 shadow-md transition hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-400/60"
          >
            <svg
              className="h-5 w-5 text-black"
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
        </div> */}
      </div>
    </section>
  );
};

const ContactCTA = () => {
  return (
    <section className="bg-[#F3F4F6] py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Gambar Dekoratif di Latar Belakang */}
      <Image
        src="/vstock-agency-3.png" // Ganti dengan path gambar bintang Anda
        alt="Decorative Star"
        width={150}
        height={150}
        className="absolute top-0 left-0 -translate-[40%] opacity-50"
      />
      <Image
        src="/vstock-agency-3.png" // Ganti dengan path gambar bintang Anda
        alt="Decorative Star"
        width={150}
        height={150}
        className="hidden md:absolute top-0 right-8 -translate-y-[40%] opacity-50"
      />
      <Image
        src="/vstock-agency-3.png" // Ganti dengan path gambar bintang Anda
        alt="Decorative Star"
        width={150}
        height={150}
        className="absolute bottom-0 right-0 md:left-1/2 rotate-180 translate-y-1/2 opacity-50"
      />

      {/* Kontainer Konten Utama */}
      <div className="relative z-10 max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 px-12">
        {/* Sisi Kiri: Teks */}
        <div className="text-center md:text-left">
          <h2 className="font-heading md:font-accent text-4xl md:text-6xl font-medium text-gray-800">
            Wan't to see our other services?
          </h2>
          <p className="mt-3 text-lg text-gray-700 font-body">
            Check out our other services.
          </p>
        </div>

        {/* Sisi Kanan: Tombol */}
        <div className="flex flex-shrink-0 items-center space-x-4">
          <ButtonPrimary
            className="!bg-[#EFEAE6]/80 !text-[#444] hover:!bg-[#E5DED8] !px-8 !py-3"
            onClick={() => {
              window.open('/media-partner', '_self');
            }}
          >
            Media Partner
          </ButtonPrimary>
        </div>
      </div>
    </section>
  );
};

export default function FAQPage() {
  return (
    <main className="bg-[#FEFBF8] overflow-x-hidden font-body">
      <Navbar />
      <FAQHero />
      <FaqSection />
      <ContactCTA />
      <FooterSection />
    </main>
  );
}
