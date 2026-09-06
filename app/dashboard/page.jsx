"use client";

import { useSession } from "next-auth/react";
import { hasAnyRole } from "@/lib/roleUtils";
import useSWR from "swr";
import Link from "next/link";
import {
  FiEdit,
  FiMic,
  FiLink,
  FiBarChart2,
  FiArrowRight,
  FiPlus,
  FiActivity,
  FiInfo,
} from "react-icons/fi";

const fetcher = (url) => fetch(url).then((res) => res.json());

// Komponen Kartu Statistik (Versi Refined)
const StatCard = ({ icon, title, value, isLoading, color, href }) => {
  const colorClasses = {
    blue: { bg: "bg-blue-100", text: "text-blue-600" },
    green: { bg: "bg-green-100", text: "text-green-600" },
    purple: { bg: "bg-purple-100", text: "text-purple-600" },
    red: { bg: "bg-red-100", text: "text-red-600" },
  };
  const colors = colorClasses[color] || {
    bg: "bg-gray-100",
    text: "text-gray-600",
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-400 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-body font-semibold text-gray-600">{title}</p>
          {isLoading ? (
            <div className="h-10 w-20 bg-gray-200 rounded-md animate-pulse mt-1"></div>
          ) : (
            <p className="font-heading text-4xl font-bold text-gray-800">
              {value ?? "0"}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colors.bg}`}>
          <div className={colors.text}>{icon}</div>
        </div>
      </div>
      <Link
        href={href}
        className="text-sm font-body font-semibold text-blue-600 hover:underline mt-4 inline-block"
      >
        View All →
      </Link>
    </div>
  );
};

// Komponen Tombol Aksi Cepat
const QuickAction = ({ icon, label, href }) => (
  <Link
    href={href}
    className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer border border-gray-200 group"
  >
    <div className="flex items-center gap-4">
      {icon}
      <span className="font-body font-medium text-gray-800">{label}</span>
    </div>
    <FiArrowRight className="text-gray-400 group-hover:translate-x-1 transition-transform" />
  </Link>
);

export default function DashboardHome() {
  const { data: session } = useSession();

  const actions = [
    {
      icon: <FiPlus className="text-blue-500" />,
      label: "New Blog Post",
      href: "/dashboard/blog/new",
      roles: ["DEVELOPER", "REPORTER"],
    },
    {
      icon: <FiPlus className="text-green-500" />,
      label: "Upload Podcast",
      href: "/dashboard/podcast",
      roles: ["DEVELOPER", "TECHNIC"],
    },
    {
      icon: <FiPlus className="text-purple-500" />,
      label: "Create Short Link",
      href: "/dashboard/links",
      roles: ["MUSIC", "DEVELOPER", "TECHNIC", "REPORTER", "KRU"],
    },
    {
      icon: <FiPlus className="text-orange-500" />,
      label: "Create Form",
      href: "/dashboard/forms",
      roles: ["MUSIC", "DEVELOPER", "TECHNIC", "REPORTER", "KRU", "DATA"],
    },
  ];

  const visibleActions = actions.filter((action) =>
    hasAnyRole(session?.user?.role, action.roles),
  );

  const { data: posts, error: postsError } = useSWR("/api/blog", fetcher);
  const { data: podcasts, error: podcastsError } = useSWR(
    "/api/podcast",
    fetcher,
  );
  const { data: links, error: linksError } = useSWR("/api/shortlinks", fetcher);

  const totalPosts = posts?.length;
  const totalPodcasts = podcasts?.length;
  const totalLinks = links?.length;
  const totalClicks = links?.reduce(
    (acc, link) => acc + (link._count?.clicks || 0),
    0,
  );
  const latestPost = posts?.[0];

  const isLoadingStats = !posts && !podcasts && !links;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-gray-800">
          Welcome to the Studio,{" "}
          <span className="text-red-600">
            {session?.user?.name?.split(" ")[0]}
          </span>
          !
        </h1>
        <p className="text-gray-600 font-body mt-2">
          Here's a snapshot of your content and performance. Let's make
          something great today.
        </p>
      </div>

      {/* New Documentation Card */}
      <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-4 flex items-start gap-4">
        <FiInfo size={40} className="text-blue-500 flex-shrink-0 mt-1" />
        <div>
          <h3 className="font-heading font-bold">Panduan Dokumentasi</h3>
          <p className="font-body text-sm mt-1">
            Kami telah menyiapkan panduan dokumentasi website 8EH Radio ITB untuk membantu Anda menggunakan dashboard ini dengan lebih mudah.
          </p>
          <a
            href="https://docs.google.com/document/d/15qoKMI8CVEu7cTKpP473kIOSQbxjcuXXc0sOMz_EagQ/edit?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="font-body font-semibold text-blue-600 hover:underline mt-2 inline-block"
          >
            Akses Dokumentasi di sini →
          </a>
        </div>
      </div>

      {/* Grid Statistik */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<FiEdit size={24} />}
          title="Blog Posts"
          value={totalPosts}
          isLoading={!posts}
          color="blue"
          href="/dashboard/blog"
        />
        <StatCard
          icon={<FiMic size={24} />}
          title="Podcasts"
          value={totalPodcasts}
          isLoading={!podcasts}
          color="green"
          href="/dashboard/podcast"
        />
        <StatCard
          icon={<FiLink size={24} />}
          title="Short Links"
          value={totalLinks}
          isLoading={!links}
          color="purple"
          href="/dashboard/links"
        />
        <StatCard
          icon={<FiBarChart2 size={24} />}
          title="Total Clicks"
          value={totalClicks}
          isLoading={!links}
          color="red"
          href="/dashboard/links"
        />
      </div>

      {/* Aksi Cepat & Aktivitas Terbaru */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="font-heading font-bold text-xl text-gray-800 mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            {visibleActions.map((action, index) => (
              <QuickAction key={index} {...action} />
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="font-heading font-bold text-xl text-gray-800 mb-4 flex items-center gap-2">
            <FiActivity /> Recent Activity
          </h2>
          {isLoadingStats ? (
            <div className="space-y-3">
              <div className="h-6 w-3/4 bg-gray-200 rounded-md animate-pulse"></div>
              <div className="h-4 w-1/2 bg-gray-200 rounded-md animate-pulse"></div>
            </div>
          ) : latestPost ? (
            <div className="group">
              <p className="text-sm font-body text-gray-500 mb-1">
                Latest Blog Post
              </p>
              <h3 className="font-heading font-semibold text-lg text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {latestPost.title}
              </h3>
              <div className="flex items-center justify-between">
                <p className="text-sm font-body text-gray-500">
                  Published on{" "}
                  {new Date(latestPost.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <Link
                  href={`/blog/${latestPost.slug}`}
                  target="_blank"
                  className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline cursor-pointer"
                >
                  View Post <FiArrowRight />
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="font-body text-gray-500">
                No recent activity to show.
              </p>
              <p className="font-body text-gray-400 text-sm mt-1">
                Create a new post to get started!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
