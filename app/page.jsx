import Navbar from "@/app/components/Navbar";
import FooterSection from "@/app/components/FooterSection";
import dynamic from "next/dynamic";
import HeroSection from "@/app/components/home/HeroSection";
import PodcastList from "@/app/components/home/PodcastList";
import NewsList from "@/app/components/home/NewsList";
import TuneTracker from "@/app/components/home/TuneTracker";
import ProgramsSection from "@/app/components/home/ProgramsSection";
import { prisma } from "@/lib/prisma";

const BoardSliderAnnouncer = dynamic(
  () => import("@/app/components/BoardSliderAnnouncer"),
  {
    loading: () => (
      <div className="h-96 animate-pulse bg-white/20 rounded-2xl w-full" />
    ),
  },
);

function AnnouncersSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-orange-400 via-orange-300 to-yellow-200 text-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center sm:text-left max-w-2xl mb-12">
          <h2 className="font-accent text-5xl sm:text-7xl text-white font-bold mb-4">
            Our Announcers
          </h2>
          <p className="font-body text-lg text-white/90">
            Temui Announcer kami yang penuh talenta dan cerita!
          </p>
        </div>
        <BoardSliderAnnouncer />
      </div>
    </section>
  );
}

export default async function Home() {
  const [podcasts, newsItems, tunes, tuneTrackerMeta] = await Promise.all([
    prisma.podcast.findMany({
      take: 2,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        subtitle: true,
        description: true,
        date: true,
        duration: true,
        audioUrl: true,
        image: true,
        coverImage: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.blogPost.findMany({
      take: 3,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        readTime: true,
        category: true,
        mainImage: true,
        createdAt: true,
        updatedAt: true,
        authors: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    }),
    prisma.tuneTrackerEntry.findMany({
      take: 10,
      orderBy: { order: "asc" },
      select: {
        id: true,
        order: true,
        title: true,
        artist: true,
        coverImage: true,
        audioUrl: true,
        itunesPreviewUrl: true,
        updatedAt: true,
      },
    }),
    prisma.tuneTrackerMeta.findFirst(),
  ]);

  // Serialize dates to avoid Next.js serialization warning/error
  const serializedPodcasts = podcasts.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  const serializedNews = newsItems.map((n) => ({
    ...n,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
    authors: n.authors.map((a) => ({
      ...a,
    })),
  }));

  const serializedTunes = tunes.map((t) => ({
    ...t,
    updatedAt: t.updatedAt.toISOString(),
  }));

  const serializedMeta = tuneTrackerMeta
    ? {
        ...tuneTrackerMeta,
        editionDate: tuneTrackerMeta.editionDate.toISOString(),
        updatedAt: tuneTrackerMeta.updatedAt.toISOString(),
      }
    : null;

  return (
    <main className="flex flex-col min-h-screen bg-white font-sans">
      <Navbar />
      <HeroSection />
      <PodcastList podcasts={serializedPodcasts} />
      <NewsList newsItems={serializedNews} />
      {/* <ProgramsSection /> */}
      <TuneTracker tunes={serializedTunes} meta={serializedMeta} />
      <AnnouncersSection />
      <FooterSection />
    </main>
  );
}
