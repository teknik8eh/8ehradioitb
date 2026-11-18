"use client";

import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { useRef } from "react";
import "swiper/css";

export default function ProgramsSlider({ title, subtitle, programs }) {
  const swiperRef = useRef(null);

  const onScrollLeft = () => {
    if (swiperRef.current && swiperRef.current.swiper) {
      swiperRef.current.swiper.slidePrev();
    }
  };

  const onScrollRight = () => {
    if (swiperRef.current && swiperRef.current.swiper) {
      swiperRef.current.swiper.slideNext();
    }
  };
  return (
    <section
      id="podcast-programs"
      className="relative py-20 lg:py-24 overflow-hidden "
    >
      <div className="absolute inset-0 top-1/8 left-0 w-40 md:w-60 opacity-70">
        <Image
          src="/vstock-programs-1.png"
          alt="Decorative Checkmark"
          width={300}
          height={300}
          className=""
        />
      </div>
      <div className="absolute top-1/4 right-0 w-40 md:w-100 opacity-100">
        <Image
          src="/vstock-podcast-4.png"
          alt="Decorative Checkmark"
          width={600}
          height={600}
          className=""
        />
      </div>
      <div className="container max-w-320 px-6 md:px-12 lg:px-16 mx-auto relative z-10">
        <div className="mx-0 md:mx-12 lg:mx-16">
          <div className="flex justify-between items-center mb-12">
            <div className="text-left">
              <p className="text-lg font-bold text-gray-800 max-w-md mx-auto md:mx-0 mb-2">
                {subtitle}
              </p>
              <h2 className="text-5xl lg:text-6xl font-accent text-left text-gray-800">
                {title}
              </h2>
            </div>
            {/* Slider Controls */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={onScrollLeft}
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
                onClick={onScrollRight}
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
        </div>

        <Swiper
          ref={swiperRef}
          slidesPerView={1.2}
          spaceBetween={20}
          centeredSlides={false}
          loop={false}
          breakpoints={{
            768: {
              slidesPerView: 1.3,
              spaceBetween: 30,
            },
            1024: {
              slidesPerView: 2,
              spaceBetween: 40,
            },
          }}
          className="!overflow-visible"
        >
          {programs.map((program, index) => (
            <SwiperSlide key={index}>
              {/* <Link href={program.link}> */}
              <div className="min-h-85 sm:min-h-0 bg-linear-to-b backdrop-blur-xs from-[#FEF9E7] to-[#F5E6A3] rounded-3xl px-8 pt-8 md:pt-8 pb-8 shadow-md flex flex-col justify-between overflow-hidden transition-all duration-300 border hover:border-zinc-300 border-zinc-200/80">
                <div className="flex flex-wrap items-center justify-center">
                  <div className="flex mb-4 w-full lg:h-32 justify-center">
                    <Image
                      src={program.logo}
                      alt={`${program.title} logo`}
                      width={300}
                      height={300}
                      className="drop-shadow-lg w-50 md:w-70 object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="text-xl lg:text-2xl font-heading font-bold text-gray-800 text-center">
                      {program.title}
                    </h3>
                    <p className="text-gray-600 font-body text-sm mt-2 text-center max-w-md mx-auto">
                      {program.description}
                    </p>
                  </div>
                </div>
              </div>
              {/* </Link> */}
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
