export default function StructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "RadioStation",
        "@id": "https://www.8ehradioitb.com/#radio",
        "name": "8EH Radio ITB",
        "alternateName": "8EH Radio",
        "description": "Tempatnya semua informasi dan hiburan untuk Kampus Mania. Dengarkan berita terbaru, musik pilihan, dan podcast yang seru hanya di 8EH Radio ITB, Your Edutainment and Music Station!",
        "url": "https://www.8ehradioitb.com",
        "logo": {
          "@type": "ImageObject",
          "url": "https://www.8ehradioitb.com/8eh-real-long.png",
          "width": 300,
          "height": 100
        },
        "image": {
          "@type": "ImageObject",
          "url": "https://opengraph.b-cdn.net/production/images/926d8e9c-a7a3-40a9-b8b4-0de2a4a36875.png?token=IKNzn_FUcVlq_Gf8fdp7krktgTVanXpsEyg4_LdRG3E&height=630&width=1200&expires=33288947365",
          "width": 1200,
          "height": 630
        },
        "sameAs": [
          "https://instagram.com/8ehradioitb",
          "https://x.com/8ehradio_",
          "https://www.linkedin.com/company/8eh-radio-itb/",
          "https://youtube.com/@8ehradioitb"
        ],
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Bandung",
          "addressRegion": "Jawa Barat",
          "addressCountry": "ID"
        },
        "areaServed": {
          "@type": "Place",
          "name": "Institut Teknologi Bandung"
        },
        "genre": ["Educational", "Entertainment", "Music", "News"],
        "broadcastDisplayName": "8EH Radio ITB",
        "inLanguage": ["id", "en"],
        "publisher": {
          "@type": "Organization",
          "name": "8EH Radio ITB",
          "url": "https://www.8ehradioitb.com"
        }
      },
      {
        "@type": "Organization",
        "@id": "https://www.8ehradioitb.com/#organization",
        "name": "8EH Radio ITB",
        "url": "https://www.8ehradioitb.com",
        "logo": {
          "@type": "ImageObject",
          "url": "https://www.8ehradioitb.com/8eh-real-long.png"
        },
        "sameAs": [
          "https://instagram.com/8ehradioitb",
          "https://x.com/8ehradio_",
          "https://www.linkedin.com/company/8eh-radio-itb/",
          "https://youtube.com/@8ehradioitb"
        ],
        "contactPoint": {
          "@type": "ContactPoint",
          "contactType": "customer service",
          "availableLanguage": ["Indonesian", "English"]
        }
      },
      {
        "@type": "WebSite",
        "@id": "https://www.8ehradioitb.com/#website",
        "url": "https://www.8ehradioitb.com",
        "name": "8EH Radio ITB",
        "description": "Tempatnya semua informasi dan hiburan untuk Kampus Mania. Dengarkan berita terbaru, musik pilihan, dan podcast yang seru hanya di 8EH Radio ITB, Your Edutainment and Music Station!",
        "publisher": {
          "@id": "https://www.8ehradioitb.com/#organization"
        },
        "potentialAction": [
          {
            "@type": "ListenAction",
            "target": "https://www.8ehradioitb.com",
            "actionStatus": "PotentialActionStatus"
          }
        ]
      }
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
} 