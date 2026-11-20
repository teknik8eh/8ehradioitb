"use client";

import { usePathname } from "next/navigation";
import GlobalAudioPlayer from "@/app/components/GlobalAudioPlayer";

export default function StudioLinkPlayerGate() {
  const pathname = usePathname();
  if (pathname === "/studio-link") return null;
  return <GlobalAudioPlayer />;
}
