"use client";
import Image from "next/image";
import Navbar from "@/app/components/Navbar";
import ButtonPrimary from "@/app/components/ButtonPrimary";
import RadioPlayer from "@/app/components/RadioPlayer";
import { useState, useRef } from "react";
import BoardSliderMB from "@/app/components/BoardSliderMB";
import FooterSection from "@/app/components/FooterSection";

const discoverCards = [
  {
    title: "Creative Content Hub",
    description:
      "Sebagai radio mahasiswa pertama di ITB, 8EH Radio hadir untuk menghadirkan konten yang tidak hanya menghibur, tapi juga menggugah pikiran dan menyuarakan aspirasi kampus.",
    icon: (
      <svg
        className="w-8 h-8 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        />
      </svg>
    ),
  },
  {
    title: "Production Excellence",
    description:
      "Di balik setiap program siaran kami, ada proses panjang dan seru yang dijalani oleh para Kru. Mulai dari konsep hingga on-air yang profesional.",
    icon: (
      <svg
        className="w-8 h-8 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
        />
      </svg>
    ),
  },
  {
    title: "Interactive Community",
    description:
      "Salah satu kekuatan utama 8EH Radio ITB adalah kedekatannya dengan pendengar. Kami membuka ruang interaksi yang hangat dan bermakna.",
    icon: (
      <svg
        className="w-8 h-8 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
  },
];

export default function AboutUs() {
  const [selectedYear, setSelectedYear] = useState("1963");
  const journeyRef = useRef(null);

  const timelineContent = {
    1963: 'Pada 20 Mei 1963, 8EH resmi didirikan oleh mahasiswa Teknik Elektro ITB sebagai radio komunitas eksperimental. Menggunakan pemancar bekas Angkatan Laut Jepang, mereka mendapatkan call sign "8EH" dari ITU dan menjadi radio FM kedua di Indonesia setelah RRI.',
    1978: "Pada 21 Januari 1978, setelah menjadi corong utama pergerakan mahasiswa, terutama siaran Buku Putih Perjuangan Mahasiswa. Stasiun ini disegel oleh Kopkamtib Jawa Barat, terkait aktivitas kritis terhadap pemerintah Orde Baru. Siaran dihentikan sejak awal 1980-an, di saat 8EH dianggap berbahaya sebagai medium perjuangan mahasiswa.",
    1999: 'Setelah vakum selama hampir dua dekade, 8EH kembali mengudara pada 31 Desember 1999. Mulai saat itu, formatnya berkembang menjadi radio komunitas "edutainment", mengudara di 107.9 FM dan streaming online.'
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar Component */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url(/sun-gradient.png)",
          }}
        ></div>

        {/* Decorative Shapes */}
        <div className="absolute inset-0">
          {/* Top left shape */}
          <div className="absolute top-90 left-30 w-48 h-48">
            <Image
              src="/vstock-aboutus-1.svg"
              alt="About Us"
              width={192}
              height={192}
            />
          </div>
          {/* Top right shape */}
          <div className="absolute top-32 right-20 w-56 h-56">
            <Image
              src="/vstock-aboutus-3.svg"
              alt="About Us"
              width={192}
              height={192}
            />
          </div>
          {/* Bottom left shape */}
          <div className="absolute bottom-40 left-10 w-48 h-48">
            <Image
              src="/vstock-aboutus-2.svg"
              alt="About Us"
              width={192}
              height={192}
            />
          </div>
          {/* Bottom right shape */}
          <div className="absolute bottom-20 right-32 w-52 h-52">
            <Image
              src="/vstock-aboutus-4.svg"
              alt="About Us"
              width={192}
              height={192}
            />
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-screen flex items-center justify-center">
          <div className="text-center text-white">
            <div className="mb-8">
              <span className="inline-block text-white px-4 py-2 rounded-full text-base font-body font-bold mb-6">
                About Us
              </span>
            </div>
            <h1 className="text-7xl md:text-8xl lg:text-9xl font-accent font-bold mb-6">
              8EH Radio ITB
            </h1>
            <p className="text-base md:text-lg font-body max-w-3xl mx-auto mb-8 text-white/90">
              Menyatukan komunitas ITB lewat konten yang seru, kreativitas tanpa batas, dan kolaborasi di dunia media.
            </p>
            <div className="flex justify-center mt-4 hidden">
              <RadioPlayer
                className="w-full max-w-md"
                showTitle={false}
                compact={true}
              />
            </div>
            <ButtonPrimary
              onClick={() =>
                journeyRef.current?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Learn More
            </ButtonPrimary>
          </div>
        </div>

        {/* Enhanced fade out to white */}
        <div
          className="absolute bottom-0 inset-x-0 pointer-events-none"
          style={{
            height: "40vh",
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 40%, rgba(255,255,255,0.9) 75%, #ffffff 100%)",
          }}
        />
      </section>

      {/* Our Journey Section */}
      <section
        ref={journeyRef}
        className="relative py-20 overflow-hidden -mt-40"
      >
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-red-50 to-yellow-100"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Microphone Image */}
            <div className="relative">
              <div className="w-full max-w-lg mx-auto">
                <Image
                  src="/mic-vstock.png"
                  alt="About Us"
                  width={1024}
                  height={1024}
                />
              </div>
            </div>

            {/* Right side - Content */}
            <div className="flex flex-col items-left justify-center">
              <div className="absolute w-full max-w-lg mx-auto -top-20 -right-40 -z-10">
                <Image
                  src="/vstock-3.png"
                  alt="About Us"
                  width={395}
                  height={395}
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col items-left justify-center">
                <h2 className="text-5xl md:text-6xl font-heading font-bold text-gray-900 mb-4">
                  Our Journey
                </h2>
                <h3 className="text-2xl md:text-3xl font-accent text-red-600 mb-6">
                  Passion for Campus Broadcasting
                </h3>

                {/* Timeline */}
                <div className="flex space-x-6 mb-6">
                  <ButtonPrimary
                    onClick={() => setSelectedYear("1963")}
                    className={
                      selectedYear === "1963"
                        ? "ring-2 ring-white ring-opacity-50"
                        : ""
                    }
                  >
                    1963
                  </ButtonPrimary>
                  <ButtonPrimary
                    onClick={() => setSelectedYear("1978")}
                    className={
                      selectedYear === "1978"
                        ? "ring-2 ring-white ring-opacity-50"
                        : ""
                    }
                  >
                    1978
                  </ButtonPrimary>
                  <ButtonPrimary
                    onClick={() => setSelectedYear("1999")}
                    className={
                      selectedYear === "1999"
                        ? "ring-2 ring-white ring-opacity-50"
                        : ""
                    }
                  >
                    1999
                  </ButtonPrimary> 
                </div>
                <div className="h-[200px] overflow-y-auto">
                  <p className="text-gray-700 font-body text-lg leading-relaxed">
                    {timelineContent[selectedYear]}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Management Board Section */}
      <section className="relative py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-5xl md:text-6xl font-accent font-bold text-gray-900 mb-2 uppercase tracking-wide">
            Management Board
          </h2>

          <p className="text-center font-semibold max-w-2xl mx-auto mb-16 text-gray-600 font-body">
            Temui para personel keren dibalik 8EH Radio ITB
          </p>

          {/* Board Grid */}
          <BoardSliderMB />
        </div>
      </section>

      {/* Discover Section */}
      <section className="relative py-32 bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50 overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 opacity-20">
          <div className="w-full h-full bg-gradient-to-bl from-orange-400 to-red-400 rounded-full blur-3xl"></div>
        </div>
        <div className="absolute bottom-0 left-0 w-72 h-72 opacity-15">
          <div className="w-full h-full bg-gradient-to-tr from-yellow-400 to-orange-400 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-accent text-gray-900 mb-6 leading-tight">
              Discover the vibrant world of{" "}
              <span className="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                8EH Radio ITB
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Dari konten kreatif hingga siaran interaktif, temukan berbagai
              program menarik yang kami tawarkan
            </p>
          </div>

          {/* Content Cards Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            {discoverCards.map((card, idx) => (
              <div
                key={idx}
                className="group relative bg-white/60 backdrop-blur-md rounded-2xl p-8 transition-all duration-300 hover:-translate-y-2 border border-gray-200/80 shadow-lg hover:shadow-xl"
              >
                <div className="mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
                    {card.icon}
                  </div>
                </div>

                <h3 className="text-2xl font-heading font-bold text-gray-900 mb-4 group-hover:text-red-600 transition-colors">
                  {card.title}
                </h3>
                <p className="text-gray-600 font-body leading-relaxed">
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Student Voices Section */}
      <section className="relative py-24 bg-white">
        <div className="hidden md:block absolute w-full max-w-lg mx-auto -top-20 left-60 translate-y-12 -translate-x-10 z-0">
          <Image
            src="/vstock-4.png"
            alt="About Us"
            width={300}
            height={300}
            className="object-contain"
          />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-5xl md:text-6xl font-heading text-gray-900 mb-4">
            Student Voices
          </h2>

          <p className="font-body text-gray-600 mb-16">
            8EH Radio ITB has transformed our campus experience.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {[
              {
                quote:
                  '"8EH Radio ITB is my go-to podcasts and articles to accompany me during campus life!"',
                name: "Nicholas Andhika Lucas",
                role: "Students, ITB",
                image: "/lucas.jpg",
              },
              {
                quote:
                  '"8EH Radio ITB has enriched our campus culture and provided invaluable experiences for students."',
                name: "Zahrah Nur Azizah",
                role: "8EH's Kru, ITB",
                image: "/foto-announcer/ara.png",
              },
            ].map((t, idx) => (
              <div key={idx} className="bg-white p-0">
                {/* Stars */}
                <div className="flex space-x-1 mb-4">
                  {[...Array(5)].map((_, starIdx) => (
                    <svg
                      key={starIdx}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-5 h-5 text-black"
                    >
                      <path d="M9.049 2.927C9.348 2.021 10.652 2.021 10.951 2.927l1.286 3.971a1 1 0 00.95.69h4.18c.969 0 1.371 1.24.588 1.81l-3.39 2.463a1 1 0 00-.364 1.118l1.288 3.972c.3.906-.755 1.657-1.54 1.118l-3.39-2.463a1 1 0 00-1.175 0l-3.39 2.463c-.784.539-1.838-.212-1.539-1.118l1.288-3.972a1 1 0 00-.364-1.118L2.045 9.398c-.783-.57-.38-1.81.588-1.81h4.18a1 1 0 00.951-.69l1.285-3.971z" />
                    </svg>
                  ))}
                </div>

                <p className="font-body text-gray-900 mb-6 text-lg leading-relaxed">
                  {t.quote}
                </p>

                <div className="flex items-center space-x-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 border border-gray-200 shadow-sm">
                    <Image
                      src={t.image}
                      alt={t.name}
                      width={120}
                      height={120}
                      className="object-cover w-full h-full"
                    />
                  </div>

                  <div>
                    <div className="font-body font-semibold text-gray-900">
                      {t.name}
                    </div>
                    <div className="font-body text-sm text-gray-500">
                      {t.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Get in Touch Section */}
      <section className="relative py-24 bg-gradient-to-b from-white via-yellow-100 to-orange-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-5xl md:text-6xl font-heading text-gray-900 mb-4">
            Get in Touch
          </h2>

          <p className="font-body text-gray-600 mb-16">
            We'd love to hear from you! Reach out for inquiries or
            collaborations.
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
      <FooterSection />
    </div>
  );
}
