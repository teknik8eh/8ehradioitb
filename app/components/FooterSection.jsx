"use client"
import Image from "next/image";
import Link from "next/link";

const footerLinks = {
  discover: [
    { title: "Programs", href: "/programs" },
    { title: "About Us", href: "/about-us" },
    { title: "FAQ", href: "/faq" },
  ],
  partnership: [
    { title: "Media Partner", href: "/media-partner" },
    { title: "Agency", href: "/agency" },
    // { title: "Join Us", href: "#" },
  ],
  pages: [
    { title: "Home", href: "/" },
    { title: "Podcast", href: "/podcast" },
    { title: "Blog", href: "/blog" },

  ],
};

const socialLinks = [
  {
    name: "X",
    href: "https://x.com/8ehradio_",
    icon: "/X.svg",
  },
  {
    name: "Instagram",
    href: "https://instagram.com/8ehradioitb",
    icon: "/Instagram.svg",
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/company/8eh-radio-itb/",
    icon: "/LinkedIn.svg",
  },
  {
    name: "Youtube",
    href: "https://youtube.com/@8ehradioitb",
    icon: "/Youtube.svg",
  },
];

export default function FooterSection() {
  return (
    <footer className="bg-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Original left side content */}
          <div className="lg:col-span-4">
            <div className="mb-6">
              <Image
                src="/8eh-real-long.png"
                className="mb-10 cursor-pointer"
                alt="8EH Logo"
                width={200}
                height={200}
                // scroll to top
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              />
            </div>
            <div className="space-y-6 font-body text-sm text-gray-700">
              <div>
                <h3 className="font-semibold mb-1 text-gray-900">Address:</h3>
                <p>Jl. Ganesha 10, Bandung</p>
              </div>
              <div>
                <h3 className="font-semibold mb-1 text-gray-900">Contact:</h3>
                <a
                  href="mailto:8eh_itb@km.itb.ac.id"
                  className="font-body text-gray-700 hover:underline"
                >
                  8eh_itb@km.itb.ac.id
                </a>
              </div>
              <div className="flex items-center space-x-4 pt-2">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-opacity hover:opacity-70"
                    aria-label={social.name}
                  >
                    <Image
                      src={social.icon}
                      alt={social.name}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Links Grid */}
          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-8 font-geist-sans">
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Pages
              </h3>
              <ul className="space-y-3">
                {footerLinks.pages.map((link) => (
                  <li key={link.title}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-600 hover:text-red-600 transition-colors"
                    >
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Discover
              </h3>
              <ul className="space-y-3">
                {footerLinks.discover.map((link) => (
                  <li key={link.title}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-600 hover:text-red-600 transition-colors"
                    >
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Partnership
              </h3>
              <ul className="space-y-3">
                {footerLinks.partnership.map((link) => (
                  <li key={link.title}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-600 hover:text-red-600 transition-colors"
                    >
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>
            &copy; {new Date().getFullYear()} 8EH Radio ITB. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
