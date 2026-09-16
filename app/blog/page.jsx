import Image from "next/image";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import FooterSection from "@/app/components/FooterSection";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Blog — 8EH Radio ITB | Artikel & Berita Kampus",
  description:
    "Baca artikel terbaru dari 8EH Radio ITB. Berita kampus, ulasan musik, liputan acara, dan konten edutainment untuk Kampus Mania.",
  alternates: {
    canonical: "https://www.8ehradioitb.com/blog",
  },
  openGraph: {
    title: "Blog — 8EH Radio ITB",
    description:
      "Baca artikel terbaru dari 8EH Radio ITB. Berita kampus, ulasan musik, liputan acara, dan konten edutainment untuk Kampus Mania.",
    url: "https://www.8ehradioitb.com/blog",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Blog 8EH Radio ITB",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog — 8EH Radio ITB",
    description:
      "Baca artikel terbaru dari 8EH Radio ITB. Berita kampus, ulasan musik, liputan acara, dan konten edutainment untuk Kampus Mania.",
  },
};

// --- NEW COMPONENTS FOR THE BLOG PAGE ---

const FeaturedArticle = ({ article }) => (
  <Link
    href={`/blog/${article.slug}`}
    className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center group"
  >
    <div className="w-full h-80 relative rounded-lg overflow-hidden">
      <Image
        src={article.mainImage || "/og-image.png"}
        alt={article.title}
        fill
        sizes="(min-width: 768px) 50vw, 100vw"
        quality={70}
        className="object-cover"
      />
    </div>
    <div>
      <p className="font-body text-sm text-red-600 mb-2 font-medium">
        {article.category}
      </p>
      <h2 className="text-3xl font-bold text-gray-900 mb-2 font-heading">
        {article.title}
      </h2>
      <p className="text-gray-600 mb-4 font-body line-clamp-2">
        {article.description}
      </p>
      <div className="flex items-center mt-auto flex-shrink-0">
        {article.authors?.[0]?.user?.image && (
          <div className="w-10 h-10 relative mr-3 flex-shrink-0">
            <Image
              src={article.authors[0].user.image}
              alt={article.authors[0].user.name || "Author"}
              fill
              className="rounded-full"
            />
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <p className="font-body font-semibold text-sm text-gray-800 truncate-words">
            {article.authors?.map((a) => a.user.name).join(", ") ||
              "8EH Radio ITB"}
          </p>
          <p className="font-body text-xs text-gray-500 truncate-words">
            {new Date(article.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {article.readTime && ` • ${article.readTime}`}
          </p>
        </div>
      </div>
    </div>
  </Link>
);

const BlogCard = ({ article }) => (
  <Link href={`/blog/${article.slug}`} className="flex flex-col group">
    <div className="w-full h-60 relative rounded-lg overflow-hidden mb-4">
      <Image
        src={article.mainImage || "/og-image.png"}
        alt={article.title}
        fill
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        quality={65}
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />
    </div>
    <p className="font-body text-sm text-red-600 mb-1 font-medium">
      {article.category}
    </p>
    <h3 className="font-heading text-xl text-gray-900 font-bold mb-3">
      {article.title}
    </h3>
    <p className="font-body text-sm text-gray-600 mb-4 flex-grow line-clamp-2">
      {article.description}
    </p>
    <div className="flex items-start text-xs text-gray-500 mt-auto flex-shrink-0">
      {article.authors?.[0]?.user?.image && (
        <div className="w-8 h-8 relative mr-2 mt-0.5 flex-shrink-0">
          <Image
            src={article.authors[0].user.image}
            alt={article.authors[0].user.name || "Author"}
            fill
            className="rounded-full"
          />
        </div>
      )}
      <div className="min-w-0">
        <p className="font-semibold text-gray-800 truncate-words">
          {article.authors?.map((a) => a.user.name).join(", ") ||
            "8EH Radio ITB"}
        </p>
        <p className="truncate-words">
          {new Date(article.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          {article.readTime && ` • ${article.readTime}`}
        </p>
      </div>
    </div>
  </Link>
);

const SectionHeader = ({ title, linkText = "See all", linkHref }) => (
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-2xl font-bold text-gray-900 font-heading">{title}</h2>
    <Link
      href={linkHref}
      className="text-sm font-medium text-red-600 hover:underline font-body"
    >
      {linkText} →
    </Link>
  </div>
);

async function getPosts() {
  const posts = await prisma.blogPost.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      readTime: true,
      category: true,
      mainImage: true,
      createdAt: true,
      authors: {
        select: {
          user: {
            select: {
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });
  return posts;
}

async function getFeaturedPost() {
  let featured = await prisma.blogPost.findFirst({
    where: { isFeatured: true },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      readTime: true,
      category: true,
      mainImage: true,
      createdAt: true,
      authors: {
        select: {
          user: {
            select: { id: true, name: true, image: true },
          },
        },
      },
    },
  });

  if (!featured) {
    featured = await prisma.blogPost.findFirst({
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
        authors: {
          select: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
        },
      },
    });
  }
  return featured;
}

export default async function Blog() {
  const [featuredArticle, allPosts] = await Promise.all([
    getFeaturedPost(),
    getPosts(),
  ]);

  // Exclude featured article from the main list to avoid duplication
  const latestBlogs = allPosts
    .filter((p) => p.id !== featuredArticle?.id)
    .slice(0, 9);

  return (
    <div className="bg-white">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {/* Welcome Header */}
        <section className="text-center p-8 bg-gray-50 rounded-lg relative overflow-hidden">
          {/* Decorative vstock images */}
          <div className="absolute top-4 left-4 opacity-20">
            <Image
              src="/vstock-podcast-3.png"
              alt="decoration"
              width={60}
              height={60}
            />
          </div>
          <div className="absolute top-4 right-4 opacity-20">
            <Image
              src="/vstock-podcast-5.png"
              alt="decoration"
              width={60}
              height={60}
            />
          </div>
          <div className="absolute bottom-4 left-1/4 opacity-15">
            <Image
              src="/vstock-agency-3.png"
              alt="decoration"
              width={40}
              height={40}
            />
          </div>
          <div className="absolute bottom-4 right-1/4 opacity-15">
            <Image
              src="/vstock-podcast-2.png"
              alt="decoration"
              width={50}
              height={50}
            />
          </div>

          <p className="text-sm font-body font-medium text-gray-500 uppercase tracking-widest mb-2">
            Blog
          </p>
          <h1 className="text-4xl font-heading font-bold text-gray-900 relative z-10">
            Craft narratives that ignite inspiration,
            <br />
            knowledge, and entertainment.
          </h1>
        </section>

        {/* Featured Article */}
        {featuredArticle && (
          <section className="relative">
            {/* Decorative elements around featured article */}
            <div className="absolute -top-8 -left-8 opacity-10 hidden lg:block">
              <Image
                src="/vstock-podcast-4.png"
                alt="decoration"
                width={120}
                height={120}
              />
            </div>
            <div className="absolute -top-4 -right-4 opacity-15 hidden lg:block">
              <Image
                src="/vstock-3.png"
                alt="decoration"
                width={80}
                height={80}
              />
            </div>
            <FeaturedArticle article={featuredArticle} />
          </section>
        )}

        {/* Latest Blog */}
        {latestBlogs.length > 0 && (
          <section className="relative">
            {/* Decorative background elements */}
            <div className="absolute top-0 left-0 opacity-5">
              <Image
                src="/vstock-home1.png"
                alt="decoration"
                width={200}
                height={200}
              />
            </div>
            <div className="absolute top-1/2 right-0 opacity-5">
              <Image
                src="/vstock-home2.png"
                alt="decoration"
                width={180}
                height={180}
              />
            </div>
            <div className="absolute bottom-0 left-1/3 opacity-8">
              <Image
                src="/vstock-podcast-1.png"
                alt="decoration"
                width={60}
                height={60}
              />
            </div>

            <SectionHeader title="Latest Blog" linkHref="/blog/all" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
              {latestBlogs.map((article) => (
                <BlogCard key={article.id} article={article} />
              ))}
            </div>
          </section>
        )}
      </main>
      <FooterSection />
    </div>
  );
}
