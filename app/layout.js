import { Geist, Geist_Mono } from "next/font/google";
import { Plus_Jakarta_Sans, Arimo, Instrument_Serif } from "next/font/google";
import "./globals.css";
import GlobalAudioPlayer from "@/app/components/GlobalAudioPlayer";
import AuthProvider from "@/app/components/AuthProvider";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import StructuredData from "@/app/components/StructuredData";
import ChatWidgetWrapper from "@/app/components/ai/ChatWidgetWrapper";
import ToastProvider from "@/app/components/ToastProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700", "800"],
});

const arimo = Arimo({
  subsets: ["latin"],
  variable: "--font-arimo",
  weight: ["400", "500", "600", "700"],
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  weight: ["400"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata = {
  title: "8EH Radio ITB",
  description:
    "Tempatnya semua informasi dan hiburan untuk Kampus Mania. Dengarkan berita terbaru, musik pilihan, dan podcast yang seru hanya di 8EH Radio ITB, Your Edutainment and Music Station!",
  keywords: [
    "radio itb",
    "8eh radio",
    "radio kampus",
    "podcast itb",
    "musik kampus",
    "edutainment",
    "radio streaming",
    "berita kampus",
    "hiburan kampus",
    "radio online",
    "podcast indonesia",
    "musik indonesia",
    "radio bandung",
    "itb radio",
    "kampus radio",
    "student radio",
    "college radio",
  ],
  authors: [{ name: "8EH Radio ITB" }],
  creator: "8EH Radio ITB",
  publisher: "8EH Radio ITB",
  category: "Radio & Broadcasting",
  classification: "Educational Entertainment",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/8eh.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/8eh.ico", sizes: "16x16", type: "image/x-icon" },
    ],
    shortcut: "/8eh.ico",
    apple: "/8eh.ico",
  },
  manifest: "/manifest.json",
  openGraph: {
    siteName: "8EH Radio ITB",
    url: "https://8ehradioitb.com",
    type: "website",
    title: "8EH Radio ITB",
    description:
      "Tempatnya semua informasi dan hiburan untuk Kampus Mania. Dengarkan berita terbaru, musik pilihan, dan podcast yang seru hanya di 8EH Radio ITB, Your Edutainment and Music Station!",
    locale: "id_ID",
    images: [
      {
        url: "https://opengraph.b-cdn.net/production/images/926d8e9c-a7a3-40a9-b8b4-0de2a4a36875.png?token=IKNzn_FUcVlq_Gf8fdp7krktgTVanXpsEyg4_LdRG3E&height=630&width=1200&expires=33288947365",
        width: 1200,
        height: 630,
        alt: "8EH Radio ITB - Your Edutainment and Music Station",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@8ehradioitb",
    creator: "@8ehradioitb",
    domain: "8ehradioitb.com",
    url: "https://8ehradioitb.com",
    title: "8EH Radio ITB",
    description:
      "Tempatnya semua informasi dan hiburan untuk Kampus Mania. Dengarkan berita terbaru, musik pilihan, dan podcast yang seru hanya di 8EH Radio ITB, Your Edutainment and Music Station!",
    images: [
      {
        url: "https://opengraph.b-cdn.net/production/images/926d8e9c-a7a3-40a9-b8b4-0de2a4a36875.png?token=IKNzn_FUcVlq_Gf8fdp7krktgTVanXpsEyg4_LdRG3E&height=630&width=1200&expires=33288947365",
        alt: "8EH Radio ITB - Your Edutainment and Music Station",
      },
    ],
  },
  alternates: {
    canonical: "https://8ehradioitb.com",
    languages: {
      "id-ID": "https://8ehradioitb.com",
    },
  },
  metadataBase: new URL("https://8ehradioitb.com"),
  other: {
    "theme-color": "#EA4A30",
    "color-scheme": "light",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "8EH Radio ITB",
    "application-name": "8EH Radio ITB",
    "msapplication-TileColor": "#EA4A30",
    "msapplication-config": "/browserconfig.xml",
  },
};

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="id">
      <head>
        <StructuredData />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${plusJakartaSans.variable} ${arimo.variable} ${instrumentSerif.variable} antialiased`}
      >
        <AuthProvider session={session}>
          {children}
          <GlobalAudioPlayer />
          <ToastProvider />
        </AuthProvider>
        {/* <ChatWidgetWrapper /> */}
      </body>
    </html>
  );
}
