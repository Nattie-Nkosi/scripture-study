"use client";

import * as React from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { speakerPhotoUrl } from "@/lib/conference/speaker-photos";

/** First + last initial, e.g. "Russell M. Nelson" → "RN". */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/** A speaker portrait that falls back to a monogram when no photo is available
 *  or the image fails to load. Size and text size come from `className`. */
export function SpeakerAvatar({
  id,
  name,
  className,
  sizes = "80px",
}: {
  id: string;
  name: string;
  className?: string;
  sizes?: string;
}) {
  const src = speakerPhotoUrl(id);
  const [failed, setFailed] = React.useState(false);
  const showPhoto = src && !failed;

  return (
    <span
      aria-hidden
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-display font-semibold tracking-tight text-primary select-none",
        className,
      )}
    >
      {showPhoto ? (
        <Image
          src={src}
          alt=""
          fill
          sizes={sizes}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
