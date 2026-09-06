"use client";
import Navbar from "../components/Navbar";
import FooterSection from "../components/FooterSection";
import Image from "next/image";
import Link from "next/link";
import ButtonPrimary from "../components/ButtonPrimary";
import "swiper/css";
import { useState, useRef, useEffect } from "react";

const rateCardData = {
  shortTerm: [
    {
      title: "Paket Pop",
      price: "FREE!",
      gradient: "from-orange-600 via-yellow-500/80 to-yellow-100/30",
      features: [
        "1x Iklan (video/poster) di feeds IG @8ehradioitb (5 hari)",
        "1x Iklan di story IG @8ehradioitb",
        "Publikasi artikel/press release di web 8ehradioitb.com",
        "1x Iklan (poster) di website 8ehradioitb.com",
      ],
    },
    {
      title: "Paket Hip Hop",
      price: "30K",
      gradient: "from-orange-600 via-yellow-500/80 to-yellow-100/30",
      features: [
        "1x Iklan (video/poster) di feeds IG @8ehradioitb (tayang 5 hari)",
        "2x Iklan di story IG @8ehradioitb",
        "Publikasi artikel/press release di web 8ehradioitb.com",
        "1x Iklan (poster) di website 8ehradioitb.com",
      ],
    },
    {
      title: "Paket Classic",
      price: "50K",
      gradient: "from-orange-600 via-yellow-500/80 to-yellow-100/30",
      features: [
        "1x Iklan (video/poster) di feeds IG @8ehradioitb (7 hari)",
        "2x Iklan di story IG @8ehradioitb",
        "1x Iklan di story IG @reporter8eh",
        "Publikasi artikel/press release di web 8ehradioitb.com",
        "1x Iklan (poster) di website 8ehradioitb.com",
        "1x Infografis post-event di IG @8ehradioitb (materi dari penyelenggara)",
      ],
    },
    {
      title: "Paket Jazz",
      price: "75K",
      gradient: "from-orange-600 via-yellow-500/80 to-yellow-100/30",
      features: [
        "5x Iklan (video/poster) di IG @8ehradioitb & @reporter8eh (7 hari, max 1x/minggu)",
        "7x Iklan di story IG @8ehradioitb & @reporter8eh (max 1x/minggu)",
        "1x Siaran online via Live IG (opsional)",
        "Artikel/Press Release di web 8ehradioitb.id",
        "1x Iklan (poster) di website 8ehradioitb.id",
        "Live report minimal 7x di story IG @8ehradioitb & @reporter8eh",
        "1x Infografis untuk post-event di IG @8ehradioitb",
        "1x Konten reels/TikTok di IG @8ehradioitb",
      ],
    },
    {
      title: "Paket Rock",
      price: "100K",
      gradient: "from-orange-600 via-yellow-500/80 to-yellow-100/30",
      features: [
        "1x Iklan (video/poster) di feeds IG @8ehradioitb (10 hari)",
        "3x Iklan di story IG @8ehradioitb (video/poster)",
        "2x Iklan di story IG @reporter8eh (video/poster)",
        "Artikel/Press Release di web 8ehradioitb.com",
        "1x Iklan (poster) di website 8ehradioitb.com",
        "Live report minimal 3x di story IG @reporter8eh",
        "1x Konten infografis/reels/TikTok untuk post-event (jika tersedia free pass & reporter)",
      ],
    },
  ],
  longTerm: [
    {
      title: "1 Month Package",
      price: "200K",
      gradient: "from-orange-600 via-yellow-500/80 to-yellow-100/30",
      features: [
        "2x Iklan (video/poster) di IG @8ehradioitb dan @reporter8eh (5 hari, max 1x/minggu)",
        "4x Iklan di story IG @8ehradioitb dan @reporter8eh (max 1x/minggu)",
        "Artikel/Press Release di web 8ehradioitb.id (konten dari penyelenggara)",
        "1x Iklan (poster) di web 8ehradioitb.id",
        "Live report minimal 4x di IG @reporter8eh (jika tersedia free pass dan reporter)",
        "1x Infografis untuk post-event di IG @8ehradioitb",
        "1x Konten reels/TikTok di IG @8ehradioitb",
      ],
    },
    {
      title: "3 Months Package",
      price: "300K",
      gradient: "from-orange-600 via-yellow-500/80 to-yellow-100/30",
      features: [
        "3x Iklan (video/poster) di IG @8ehradioitb (7 hari, max 1x/minggu)",
        "3x Iklan (video/poster) di IG @reporter8eh (5 hari, max 1x/minggu)",
        "5x Iklan di story IG @8ehradioitb (max 1x/minggu)",
        "5x Iklan di story IG @reporter8eh (max 1x/minggu)",
        "1x Siaran online untuk promosi event via Live IG (opsional)",
        "Artikel/Press Release di web 8ehradioitb.id (konten dari penyelenggara)",
        "1x Iklan (poster) di website 8ehradioitb.id",
        "Live report minimal 5x di story IG @reporter8eh dan @8ehradioitb (jika ada free pass dan reporter)",
        "1x Infografis untuk post-event di IG @8ehradioitb",
        "1x Konten reels/TikTok di IG @8ehradioitb",
      ],
    },
    {
      title: "6 Months Package",
      price: "400K",
      gradient: "from-orange-600 via-yellow-500/80 to-yellow-100/30",
      features: [
        "5x Iklan (video/poster) di IG @8ehradioitb (7 hari, max 1x/minggu)",
        "5x Iklan (video/poster) di IG @reporter8eh (7 hari, max 1x/minggu)",
        "7x Iklan di story IG @8ehradioitb (max 1x/minggu)",
        "7x Iklan di story IG @reporter8eh (max 1x/minggu)",
        "1x Siaran online untuk promosi event via Live IG (opsional)",
        "Artikel/Press Release di web 8ehradioitb.id (konten dari penyelenggara)",
        "1x Iklan (poster) di website 8ehradioitb.id",
        "Live report minimal 7x di story IG @reporter8eh dan @8ehradioitb (jika ada free pass dan reporter)",
        "1x Infografis untuk post-event di IG @8ehradioitb",
        "1x Konten reels/TikTok di IG @8ehradioitb",
      ],
    },
  ],
};

// --- DATA PROSEDUR DIPERBARUI DENGAN PROPERTI 'type' ---
const procedureData = [
  {
    id: "terms-and-conditions",
    title: "Terms and Conditions",
    type: "main", // Tipe menu utama
    content: [
      "Lingkup acara yang dapat melakukan kerja sama media partner dengan 8EH Radio ITB adalah acara yang diselenggarakan oleh internal ITB, organisasi kampus lain, festival musik, dan lain-lain yang sesuai dengan 8EH Radio ITB: Edutainment, Education and Entertainment.",
      "Persyaratan/kewajiban pihak acara wajib dilengkapi terlebih dahulu sebelum 8EH Radio ITB menjalankan kesepakatan publikasi.",
      "Kewajiban pada perjanjian kerja sama bersifat fleksibel dan negotiabale sesuai dengan kesepakatan kedua belah pihak.",
    ],
  },
  {
    id: "procedure-media-partner",
    title: "Prosedur Media Partner",
    type: "main", // Tipe menu utama (berfungsi sebagai judul)
    content: [], // Konten kosong karena ini hanya judul
  },
  {
    id: "umum",
    title: "Umum",
    type: "sub", // Tipe submenu
    content: [
      "Penyelenggara acara wajib mengisi dan menandatangani Memorandum of Understanding (MoU) sesuai kesepakatan dengan paket media partner yang dipilih maksimal H-15 acara.",
      "Wajib mengisi dan mengirimkan konten publikasi maksimal H-3 sebelum konten di-upload. Konten yang di-upload hanya konten yang dikirimkan saja oleh pihak penyelenggara.",
      "Wajib mengirimkan bukti pemenuhan persyaratan (biaya administrasi dan syarat follow kepada contact person maksimal H-3 upload konten).",
      "Wajib melakukan konfirmasi melalui contact person yang tertera pada email (negosiasi terkait paket media partner dapat dipertimbangkan).",
    ],
  },
  {
    id: "artikel-iklan",
    title: "Artikel / Iklan",
    type: "sub", // Tipe submenu
    content: [
      "Wajib mengirimkan materi artikel maupun konten publikasi iklan maksimal H-3 sebelum konten di-upload di website @8ehradioitb. Konten yang di-upload hanya konten yang disediakan oleh pihak penyelenggara.",
    ],
  },
  {
    id: "siaran-live",
    title: "Siaran Live IG / Podcast / Siaran",
    type: "sub", // Tipe submenu
    content: [
      "Wajib melakukan konfirmasi untuk siaran live Instagram kepada contact person maksimal H-14 sebelum jadwal siaran.",
      "Wajib mengisi dan menyerahkan materi siaran live Instagram kepada contact person maksimal H-10 sebelum jadwal siaran Prosedur Live Report.",
    ],
  },
  {
    id: "live-report",
    title: "Live Report",
    type: "sub", // Tipe submenu
    content: [
      "Wajib memberikan konfirmasi free pass yang akan diterima 8EH Radio ITB kepada contact person maksimal H-14 sebelum pelaksanaan acara yang akan diliput.",
    ],
  },
  {
    id: "infografis",
    title: "Infografis",
    type: "sub", // Tipe submenu
    content: [
      "Wajib mengisi dan mengirimkan materi infografis untuk post-event selambat-lambatnya H+3 setelah acara berlangsung. Konten yang di-upload hanya konten yang dikirimkan saja oleh pihak penyelenggara. Konten akan diunggah di Instagram @8ehradioitb selambat-lambatnya H+7 setelah materi diterima.",
    ],
  },
];

const partners = [
  { name: "Tau Tau Fest", src: "/tau.png" },
  { name: "We The Fest", src: "/wtf.png" },
  { name: "Pertamina Goes To Campus", src: "/pertamina.png" },
  { name: "Pestipalin", src: "/pestipalin.png" },
  { name: "Podcast Campus", src: "/podcast_campus.png" },
  { name: "Lakunakota", src: "/lakunakota.png" },
];

// --- Komponen Checkmark untuk daftar fitur ---
const CheckmarkIcon = () => (
  <svg
    className="w-4 h-4 text-black flex-shrink-0 mr-3 mt-1"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={3}
      d="M5 13l4 4L19 7"
    />
  </svg>
);

const MedpartHero = () => {
  return (
    <section className="relative bg-gradient-to-b from-white to-yellow-200 pt-48 pb-0 overflow-hidden">
      {/* Decorative gradient blob */}
      <Image
        src="/telephone-medpart.png"
        alt="Telephone Illustration"
        width={600}
        height={600}
        className="absolute top-[5%] md:top-[20%] left-0 md:left-1/2 md:-translate-x-[220%] pointer-events-none select-none z-0 w-30 md:w-80"
        priority
      />
      <Image
        src="/camera-medpart.png"
        alt="Camera Illustration"
        width={600}
        height={600}
        className="absolute top-0 right-0 md:right-1/2 translate-x-[30%] md:translate-x-[160%] pointer-events-none select-none z-0 w-60 md:w-120"
        priority
      />

      {/* Kontainer Konten Utama */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-24 relative z-10 flex items-center">
        {/* Sisi Kiri: Teks & Tombol */}
        <div className="w-full text-start mb-12 md:mb-0">
          <h1 className="font-accent text-6xl md:text-8xl font-medium text-gray-800 mb-6">
            Partner with Us
          </h1>
          <p className="text-lg text-gray-700 mx-auto md:mx-0 mb-8">
            Temukan peluang baru dengan berkolaborasi bersama 8EH Radio ITB
            melalui media partnership!
          </p>
        </div>
      </div>

      {/* Radio Image with Fade */}
      <div className="relative -mt-80 mb-30 md:mb-0 md:-mt-90 flex justify-center">
        <Image
          src="/vstock-medpart-1.png"
          alt="Radio Illustration"
          width={1440}
          height={700}
          className="[mask-image:linear-gradient(to_bottom,red_60%,orange_100%)] mix-blend-hard-light max-w-[1920] w-full pointer-events-none select-none"
          priority
        />
      </div>
    </section>
  );
};

const OfferedService = () => {
  return (
    <section className="relative pt-40 bg-gradient-to-b from-yellow-200 to-white overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-20">
        <div className="mb-8">
          <h1 className="text-6xl font-accent text-black">Offered Services</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 justify-content-center lg:w-full mx-auto">
          <div className="bg-gradient-to-br from-orange-600/80 via-yellow-500/50 to-yellow-100/30 transition-all duration-300 border hover:border-gray-300 border-gray-200/80 rounded-4xl md:shadow-xl px-10 py-6 mb-4 md:px-16 grid md:grid-cols-1 gap-8 items-center backdrop-blur-xs">
            <div className="grid grid-cols-1 gap-x-12 gap-y-6 justify-content-center lg:w-full mx-auto">
              <div className="grid grid-cols-6 items-start space-x-4">
                <Image
                  src="/icon-medpart-1.png"
                  alt="GPS Icon"
                  width={36}
                  height={36}
                  className="justify-self-center self-center col-span-1"
                />
                <div className="self-center col-span-5">
                  <h3 className="text-lg font-body font-semibold text-black">
                    Siaran / Live IG / Podcast
                  </h3>
                  <p className="text-black font-body text-sm">
                    Live IG atau podcast bareng tim 8EH
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-6 items-start space-x-4">
                <Image
                  src="/icon-medpart-2.png"
                  alt="GPS Icon"
                  width={36}
                  height={36}
                  className="justify-self-center self-center col-span-1"
                />
                <div className="self-center col-span-5">
                  <h3 className="text-lg font-body font-semibold text-black">
                    Live Report
                  </h3>
                  <p className="text-black font-body text-sm">
                    Liputan langsung saat event berlangsung
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-600/80 via-yellow-500/50 to-yellow-100/30 transition-all duration-300 border hover:border-gray-300 border-gray-200/80 rounded-4xl md:shadow-xl px-10 py-6 mb-4 md:px-16 grid md:grid-cols-1 gap-8 items-center backdrop-blur-xs">
            <div className="grid grid-cols-1 gap-x-12 gap-y-6 justify-content-center lg:w-full mx-auto">
              <div className="grid grid-cols-6 items-start space-x-4">
                <Image
                  src="/icon-medpart-3.png"
                  alt="GPS Icon"
                  width={36}
                  height={36}
                  className="justify-self-center self-center col-span-1"
                />
                <div className="self-center col-span-5">
                  <h3 className="text-lg font-body font-semibold text-black">
                    Artikel / Iklan
                  </h3>
                  <p className="text-black font-body text-sm">
                    Iklan di feed & story Instagram 8EH
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-6 items-start space-x-4">
                <Image
                  src="/icon-medpart-4.png"
                  alt="GPS Icon"
                  width={36}
                  height={36}
                  className="justify-self-center self-center col-span-1"
                />
                <div className="self-center col-span-5">
                  <h3 className="text-lg font-body font-semibold text-black">
                    Infografis
                  </h3>
                  <p className="text-black font-body text-sm">
                    Konten visual post-event di IG
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

function RateCard() {
  const [activeTerm, setActiveTerm] = useState("shortTerm");
  const currentPlans = rateCardData[activeTerm];

  return (
    <section className="bg-slate-100 py-20 px-4 relative mt-12">
      <div className="absolute top-10 left-0 md:left-1/2 opacity-80 md:-translate-x-[100%] w-30 md:w-90">
        <Image
          src="/vstock-medpart-2.png"
          alt="decoration"
          width={150}
          height={150}
        />
      </div>
      <div className="absolute top-10 right-0 md:right-1/2 opacity-80 md:translate-x-[160%] w-30 md:w-90">
        <Image
          src="/vstock-medpart-3.png"
          alt="decoration"
          width={150}
          height={150}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <p className="font-body font-bold text-gray-800">Media Partner</p>
        <h2 className="font-accent text-7xl font-bold text-gray-900 mb-2">
          Rate Card
        </h2>
        <p className="font-body text-gray-600 mb-16">
          Pilih paket terbaik sesuai kebutuhan mediamu!
        </p>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* --- SWITCH CATEGORY DENGAN ANIMASI GESER --- */}
        <div className="flex justify-center mb-12">
          <div className="relative flex w-72 items-center rounded-full bg-gray-200 p-1">
            {/* Latar Belakang yang Bergeser */}
            <div
              className={`absolute h-[calc(100%-8px)] w-1/2 rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out
               ${activeTerm === "shortTerm" ? "translate-x-0" : "translate-x-[calc(100%-8px)]"}`}
            />

            {/* Tombol Teks (di atas latar belakang) */}
            <button
              onClick={() => setActiveTerm("shortTerm")}
              className={`relative z-10 w-1/2 py-2 text-center text-sm font-semibold transition-colors duration-300 cursor-pointer ${
                activeTerm === "shortTerm" ? "text-gray-800" : "text-gray-500"
              }`}
            >
              Short Term
            </button>
            <button
              onClick={() => setActiveTerm("longTerm")}
              className={`relative cursor-pointer z-10 w-1/2 py-2 text-center text-sm font-semibold transition-colors duration-300 ${
                activeTerm === "longTerm" ? "text-gray-800" : "text-gray-500"
              }`}
            >
              Long Term
            </button>
          </div>
        </div>

        {/* Container untuk Kartu Harga (tetap sama) */}
        <div className="flex flex-wrap justify-center gap-4">
          {currentPlans.map((plan, index) => (
            <div
              key={index}
              className={`rounded-4xl p-8 text-black flex flex-col shadow-md border border-gray-300 backdrop-blur-md transform hover:scale-101 transition-transform duration-300 bg-gradient-to-br ${plan.gradient} max-w-xs`} // max-w-xs digunakan untuk lebar maksimal 20rem (320px)
            >
              <h3 className="text-2xl font-heading mb-2 text-center">
                {plan.title}
              </h3>
              <p className="text-5xl font-heading font-semibold mb-6 text-center">
                {plan.price}
              </p>

              <ul className="space-y-2 mb-8 flex-grow">
                {plan.features.map((feature, fIndex) => (
                  <li key={fIndex} className="flex items-start">
                    <CheckmarkIcon />
                    <span className="font-body text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <ButtonPrimary
                className="!bg-[#EA4A30] !text-white hover:!bg-[#D0402A] !px-8 !py-2"
                onClick={() => {
                  const subject = encodeURIComponent(
                    `Permohonan Media Partner: ${plan.title}`,
                  );
                  const body = encodeURIComponent(
                    `Halo 8EH Radio ITB,\n\nSaya ingin mendaftar sebagai media partner dan memilih paket berikut:\n\nPaket: ${plan.title}\nHarga: ${plan.price}\n\nMohon informasikan langkah selanjutnya. Terima kasih!\n\n(Nama Anda)\n(Instansi/Organisasi)\n(Kontak yang bisa dihubungi)`,
                  );
                  window.location.href = `mailto:8eh_itb@km.itb.ac.id?subject=${subject}&body=${body}`;
                }}
              >
                Daftar Sekarang
              </ButtonPrimary>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const ProsedurSection = () => {
  const [activeSection, setActiveSection] = useState("terms-and-conditions");
  const sectionRefs = useRef({});

  const scrollToSection = (id) => {
    const sectionElement = sectionRefs.current[id];
    if (!sectionElement) return;

    const offset = 40; // Jarak margin atas yang diinginkan
    const bodyRect = document.body.getBoundingClientRect().top;
    const elementRect = sectionElement.getBoundingClientRect().top;
    const elementPosition = elementRect - bodyRect;
    const offsetPosition = elementPosition - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-40px 0px -100% 0px" },
    );

    Object.values(sectionRefs.current).forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => {
      Object.values(sectionRefs.current).forEach((section) => {
        if (section) observer.unobserve(section);
      });
    };
  }, []);

  return (
    <section className="bg-gradient-to-b from-white to-gray-400 py-20 px-4 sm:px-6 lg:px-8 relative overflow-clip">
      {/* Gambar Dekoratif */}
      <Image
        src="/vstock-podcast-1.png"
        alt="Decorative"
        width={100}
        height={100}
        className="absolute top-1/2 left-5 opacity-100 -rotate-12 w-30"
      />
      <Image
        src="/vstock-podcast-2.png"
        alt="Decorative"
        width={300}
        height={300}
        className="absolute bottom-4 left-1/2 opacity-100 rotate-12 w-40 z-0"
      />
      <Image
        src="/vstock-podcast-3.png"
        alt="Decorative"
        width={300}
        height={300}
        className="absolute top-0 right-0 opacity-100 rotate-12 w-40 z-0"
      />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Kolom Kiri: Daftar Isi (Table of Contents) */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 bg-gray-300/60 backdrop-blur-sm text-black rounded-2xl shadow-lg">
            {/* <h3 className="text-xl font-bold mb-4">Terms and Condition</h3> */}
            <ul className="space-y-[0.5px]">
              {procedureData.map((item) => (
                <li key={item.id}>
                  {/* --- LOGIKA BARU UNTUK MENAMPILKAN MENU --- */}
                  {/* Jika item punya konten, buat menjadi tombol yang bisa
                  diklik */}
                  <button
                    onClick={() => scrollToSection(item.id)}
                    className={`w-full text-left px-4 py-2 rounded-4xl text-sm cursor-pointer transition-all duration-300 
                        ${item.type === "sub" ? "pl-8" : ""} 
                        ${
                          activeSection === item.id
                            ? "bg-gray-500 font-semibold text-white"
                            : "hover:font-semibold"
                        }`}
                  >
                    {item.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Kolom Kanan: Konten Prosedur */}
        <main className="lg:col-span-3">
          <div className="bg-white/50 backdrop-blur-sm p-8 sm:p-12 rounded-4xl shadow-lg z-20 relative">
            <div className="space-y-12">
              {/* Filter agar judul tanpa konten tidak dirender di sini */}
              {procedureData
                .filter((section) => section.content.length >= 0)
                .map((section) => (
                  <div
                    key={section.id}
                    id={section.id}
                    ref={(el) => (sectionRefs.current[section.id] = el)}
                  >
                    <h2
                      className={`
                    ${section.type === "main" ? "text-4xl border-orange-500" : "text-3xl border-orange-400"}
                    font-bold font-heading text-gray-800 mb-4 border-l-4  pl-4
                    `}
                    >
                      {section.title}
                    </h2>
                    <ol className="font-body list-decimal list-inside space-y-3 text-gray-700 leading-relaxed">
                      {section.content.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ol>
                  </div>
                ))}
            </div>
          </div>
        </main>
      </div>
    </section>
  );
};

const PartnerMarquee = () => {
  // Gandakan array untuk loop yang lebih panjang dan mulus
  const extendedPartners = [...partners, ...partners, ...partners];

  return (
    <section className="py-12 px-4 md:px-12 lg:px-24">
      {/* 1. Kontainer utama: 
        - flex-col di mobile (default)
        - md:flex-row di desktop
        - md:h-24 untuk tinggi spesifik di desktop
      */}
      <div className="flex w-full flex-col items-center overflow-hidden rounded-3xl bg-gradient-to-r from-orange-500 to-yellow-400 shadow-lg md:flex-row md:h-24">
        {/* 2. Bagian Teks Statis:
          - Padding dan perataan teks diatur untuk mobile dan desktop
        */}
        <div className="flex-shrink-0 p-6 text-center md:p-8 md:text-left md:w-1/4">
          <p className="text-sm font-semibold text-black">
            8EH Radio ITB telah menjalin kolaborasi dengan berbagai institusi
            dan mitra
          </p>
        </div>

        {/* 3. Bagian Jendela Scrolling:
          - Mengambil lebar penuh di mobile dan sisa ruang di desktop
        */}
        <div className="w-full flex-1 overflow-hidden border-t-2 border-black/10 py-4 md:border-t-0 md:py-0">
          <div className="flex animate-marquee-infinite">
            {extendedPartners.map((partner, index) => (
              <div
                key={`p1-${index}`}
                // Margin horizontal diperkecil untuk mobile
                className="flex flex-shrink-0 items-center space-x-3"
              >
                <Image
                  src={partner.src}
                  alt={partner.name}
                  // Ukuran logo diperkecil agar pas di layar mobile
                  width={150}
                  height={150}
                  className="object-contain w-40 h-40"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const GetInTouch = () => {
  return (
    <section className="relative py-24 bg-gradient-to-b from-white via-yellow-100 to-orange-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-5xl md:text-6xl font-heading text-gray-900 mb-4">
          Get in Touch
        </h2>

        <p className="font-body text-gray-600 mb-16">
          Kami ingin mendengar kabar darimu! Hubungi kami untuk pertanyaan,
          saran, atau kolaborasi lebih lanjut.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Contact details */}
          <div className="space-y-8">
            <div className="flex items-start space-x-4">
              <div className="w-6 h-6 mt-1 flex-shrink-0 text-gray-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-body font-bold text-lg text-gray-900 mb-1">
                  Email
                </h3>
                <a
                  href="mailto:8eh_itb@km.itb.ac.id"
                  className="font-body text-gray-700 hover:underline"
                >
                  8eh_itb@km.itb.ac.id
                </a>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-6 h-6 mt-1 flex-shrink-0 text-gray-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-body font-bold text-lg text-gray-900 mb-1">
                  Phone
                </h3>
                <a
                  href="https://wa.me/6281584225370"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-body text-gray-700 hover:underline"
                >
                  +62 815 8422 5370
                </a>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-6 h-6 mt-1 flex-shrink-0 text-gray-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-body font-bold text-lg text-gray-900 mb-1">
                  Office
                </h3>
                <p className="font-body text-gray-700">
                  Jl. Ganesha No. 10, Bandung, Indonesia
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Google Maps iframe */}
        <div className="relative rounded-3xl overflow-hidden h-150 w-full mt-10">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d63374.86072097309!2d107.53145050717926!3d-6.89911962316508!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e68e6578d4253e7%3A0x136b7b51bcb1002d!2sSunken%20Court%2C%20ITB!5e0!3m2!1sid!2sid!4v1751814179388!5m2!1sid!2sid"
            width="600"
            height="450"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 w-full h-full"
          ></iframe>
        </div>
      </div>
    </section>
  );
};

export default function MediaPartnerPage() {
  return (
    <main className="bg-[#FEFBF8] font-body">
      <Navbar />
      <MedpartHero />
      <OfferedService />
      <RateCard />
      <ProsedurSection />
      <PartnerMarquee />
      <GetInTouch />
      <FooterSection />
    </main>
  );
}
