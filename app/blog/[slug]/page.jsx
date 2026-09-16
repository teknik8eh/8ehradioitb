import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { notFound } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import FooterSection from "@/app/components/FooterSection";
import { prisma } from "@/lib/prisma";
import ArticleStructuredData from "@/app/components/ArticleStructuredData";
import TLDRSection from "@/app/components/TLDRSection";
import { cache } from "react";

const getPost = cache(async (slug) => {
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    include: {
      authors: {
        include: {
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
  return post;
});

const SITE_URL = "https://www.8ehradioitb.com";

function stripMarkdown(text = "") {
  return text
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\(.*?\)/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/>\s?/g, "")
    .replace(/\n+/g, " ")
    .trim();
}

export async function generateMetadata({ params }) {
  const slug = await params.slug;
  const post = await getPost(slug);

  if (!post) {
    return {
      title: "Post Not Found",
      description: "The post you are looking for could not be found.",
    };
  }

  const rawDescription = post.description || post.content?.substring(0, 300);
  const description = stripMarkdown(rawDescription).substring(0, 160);

  return {
    title: post.title,
    description: description,
    keywords: post.tags,
    alternates: {
      canonical: `${SITE_URL}/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: description,
      url: `${SITE_URL}/blog/${post.slug}`,
      images: [
        {
          url: post.mainImage || "/8eh-real-long.png",
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      type: "article",
      article: {
        publishedTime: post.createdAt.toISOString(),
        authors: post.authors?.map((a) => a.user.name).join(", "),
        tags: post.tags,
      },
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: description,
      images: [post.mainImage || "/8eh-real-long.png"],
    },
  };
}

// --- BLOG POST PAGE ---
export default async function BlogPostPage({ params }) {
  const post = await getPost(params.slug);

  if (!post) {
    notFound();
  }

  const mainAuthor = post.authors?.[0]?.user;
  const coAuthors = post.authors?.slice(1).map((a) => a.user);
  const allAuthorNames =
    post.authors?.map((a) => a.user.name).join(", ") || "8EH Radio ITB";

  return (
    <div className="bg-white">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <article>
          {/* Header */}
          <div className="mb-12">
            <p className="text-sm font-body text-red-600 mb-2 font-semibold">
              {post.category}
            </p>
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-gray-900 mb-6">
              {post.title}
            </h1>
            <div className="flex justify-between items-center">
              <div className="flex items-start space-x-3 min-w-0 flex-1">
                {mainAuthor?.image && (
                  <div className="w-12 h-12 bg-gray-200 rounded-full relative overflow-hidden flex-shrink-0">
                    <Image
                      src={mainAuthor.image}
                      alt={mainAuthor.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-body font-semibold text-gray-900 truncate-words">
                    {allAuthorNames}
                  </p>
                  <p className="font-body text-sm text-gray-500">
                    {new Date(post.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    {post.readTime && ` • ${post.readTime}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4 text-gray-700 flex-shrink-0">
                {/* LinkedIn Share */}
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                    `${SITE_URL}/blog/${post.slug}`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Share on LinkedIn"
                >
                  <Image
                    src="/LinkedIn.svg"
                    alt="LinkedIn"
                    width={20}
                    height={20}
                    className="cursor-pointer transition-opacity hover:opacity-75"
                  />
                </a>
                {/* X/Twitter Share */}
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(
                    `${SITE_URL}/blog/${post.slug}`,
                  )}&text=${encodeURIComponent(`Artikel terbaru 8EH Radio ITB, '${post.title}', seru banget! Gimana menurutmu? Baca selengkapnya:`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Share on X"
                >
                  <Image
                    src="/X.svg"
                    alt="X"
                    width={20}
                    height={20}
                    className="cursor-pointer transition-opacity hover:opacity-75"
                  />
                </a>
              </div>
            </div>
          </div>

          {/* Main Image */}
          {post.mainImage && (
            <div className="w-full aspect-video bg-gray-200 rounded-2xl relative overflow-hidden mb-12 shadow-lg">
              <Image
                src={post.mainImage}
                alt={post.title}
                fill
                sizes="(min-width: 1024px) 896px, 100vw"
                quality={75}
                className="object-cover"
              />
            </div>
          )}

          {/* TL;DR Section */}
          {post.content && post.content.length >= 500 && (
            <TLDRSection content={post.content} title={post.title} />
          )}

          {/* Markdown Content */}
          <div className="max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ node, ...props }) => (
                  <h1
                    className="text-4xl font-heading font-bold text-gray-900 mb-6 mt-8 leading-tight"
                    {...props}
                  />
                ),
                h2: ({ node, ...props }) => (
                  <h2
                    className="text-3xl font-heading font-bold text-gray-900 mb-4 mt-8 leading-tight"
                    {...props}
                  />
                ),
                h3: ({ node, ...props }) => (
                  <h3
                    className="text-2xl font-heading font-bold text-gray-900 mb-3 mt-6 leading-tight"
                    {...props}
                  />
                ),
                h4: ({ node, ...props }) => (
                  <h4
                    className="text-xl font-heading font-bold text-gray-900 mb-2 mt-4 leading-tight"
                    {...props}
                  />
                ),
                p: ({ node, ...props }) => (
                  <p
                    className="font-body text-gray-800 leading-relaxed mb-4"
                    {...props}
                  />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote
                    className="border-l-4 border-red-600 bg-gray-50 pl-6 py-4 italic font-body text-gray-800 my-6"
                    {...props}
                  />
                ),
                img: ({ node, ...props }) => (
                  <div className="my-8">
                    <img
                      className="rounded-xl shadow-md w-full h-auto object-cover"
                      {...props}
                    />
                  </div>
                ),
                a: ({ node, ...props }) => (
                  <a
                    className="text-red-600 no-underline hover:underline hover:text-red-700"
                    {...props}
                  />
                ),
                ul: ({ node, ...props }) => (
                  <ul
                    className="list-disc pl-6 mb-4 font-body text-gray-800"
                    {...props}
                  />
                ),
                ol: ({ node, ...props }) => (
                  <ol
                    className="list-decimal pl-6 mb-4 font-body text-gray-800"
                    {...props}
                  />
                ),
                li: ({ node, ...props }) => (
                  <li className="mb-1 font-body text-gray-800" {...props} />
                ),
                strong: ({ node, ...props }) => (
                  <strong className="text-gray-900 font-semibold" {...props} />
                ),
                em: ({ node, ...props }) => (
                  <em className="text-gray-800" {...props} />
                ),
                code: ({ node, ...props }) => (
                  <code
                    className="text-red-600 bg-gray-100 px-1 py-0.5 rounded"
                    {...props}
                  />
                ),
                pre: ({ node, ...props }) => (
                  <pre
                    className="bg-gray-100 text-gray-800 border border-gray-200 p-4 rounded-lg overflow-x-auto"
                    {...props}
                  />
                ),
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>

          {/* Footer Section */}
          <div className="mt-16 border-t border-gray-200 pt-8">
            {/* Tags Section */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 mb-8">
                <span className="font-body font-semibold mr-2 text-gray-700">
                  Tags
                </span>
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-gray-200 text-gray-700 text-sm font-medium px-3 py-1 rounded-full font-body"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Author Box */}
            {post.authors && post.authors.length > 0 && (
              <div className="bg-gray-50 p-6 rounded-2xl">
                {mainAuthor && (
                  <div className="flex items-center space-x-6">
                    <div className="w-20 h-20 bg-gray-200 rounded-full relative overflow-hidden flex-shrink-0">
                      <Image
                        src={mainAuthor.image || "/8eh-real.svg"}
                        alt={mainAuthor.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-body text-sm text-gray-500 mb-1">
                        Written by
                      </p>
                      <p className="font-heading font-bold text-lg text-gray-900">
                        {mainAuthor.name}
                      </p>
                    </div>
                  </div>
                )}

                {coAuthors && coAuthors.length > 0 && (
                  <div className="mt-6 space-y-6">
                    {coAuthors.map((author) => (
                      <div
                        key={author.id}
                        className="flex items-center space-x-6"
                      >
                        <div className="w-20 h-20 bg-gray-200 rounded-full relative overflow-hidden flex-shrink-0">
                          <Image
                            src={author.image || "/8eh-real.svg"}
                            alt={author.name}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-body text-sm text-gray-500 mb-1">
                            Co-Author
                          </p>
                          <p className="font-heading font-bold text-lg text-gray-900">
                            {author.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </article>
      </main>
      <FooterSection />
      <ArticleStructuredData post={post} />
    </div>
  );
}
