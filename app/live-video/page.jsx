import Navbar from "@/app/components/Navbar";
import FooterSection from "@/app/components/FooterSection";
import { getLiveVideoUrl } from "@/lib/live-video";
import LiveVideoPlayer from "./LiveVideoPlayer";

export const metadata = { title: "Tonton Siaran | 8EH Radio ITB" };

export default function LiveVideoPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 pb-24 pt-28 sm:px-8">
        <h1 className="mb-6 font-heading text-3xl font-bold text-gray-950 sm:text-5xl">
          Tonton Siaran
        </h1>
        <LiveVideoPlayer url={getLiveVideoUrl()} />
      </main>
      <FooterSection />
    </div>
  );
}
