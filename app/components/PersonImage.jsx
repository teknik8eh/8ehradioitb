"use client";

import { useState } from "react";
import Image from "next/image";
import { getAssetUrl } from "@/lib/audioUtils";

/**
 * Person photo with automatic fallback to the 8eh.png placeholder
 * when the person's photo file is missing (e.g. not yet uploaded to R2).
 */
export default function PersonImage({ src, alt, ...props }) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [failed, setFailed] = useState(false);

  return (
    <Image
      {...props}
      src={currentSrc}
      alt={alt}
      onError={() => {
        // Fall back to the global placeholder exactly once
        if (!failed) {
          setFailed(true);
          setCurrentSrc(getAssetUrl("8eh.png"));
        }
      }}
    />
  );
}
