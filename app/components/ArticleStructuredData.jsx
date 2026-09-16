import PropTypes from "prop-types";

export default function ArticleStructuredData({ post }) {
  if (!post) return null;

  const {
    title,
    description,
    slug,
    mainImage,
    createdAt,
    updatedAt,
    authors = [],
    tags = [],
    category,
  } = post;

  const authorList = authors.map((a) => ({
    "@type": "Person",
    name: a.user?.name || "8EH Radio ITB",
  }));

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://www.8ehradioitb.com/",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Blog",
            item: "https://www.8ehradioitb.com/blog",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: title,
            item: `https://www.8ehradioitb.com/blog/${slug}`,
          },
        ],
      },
      {
        "@type": "BlogPosting",
        headline: title,
        description,
        image: mainImage || "https://www.8ehradioitb.com/8eh-real-long.png",
        datePublished: new Date(createdAt).toISOString(),
        dateModified: new Date(updatedAt || createdAt).toISOString(),
        author:
          authorList.length > 0
            ? authorList
            : {
                "@type": "Organization",
                name: "8EH Radio ITB",
              },
        publisher: {
          "@type": "Organization",
          name: "8EH Radio ITB",
          logo: {
            "@type": "ImageObject",
            url: "https://www.8ehradioitb.com/8eh-real-long.png",
          },
        },
        keywords: tags.join(", "),
        articleSection: category,
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": `https://www.8ehradioitb.com/blog/${slug}`,
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

ArticleStructuredData.propTypes = {
  post: PropTypes.object,
};
