// Speaker portraits are NOT provided by the conference API — supply your own.
//
// Resolution order (first match wins); anything missing or broken falls back to
// a monogram avatar automatically:
//
//   1. Per-speaker override in SPEAKER_PHOTOS below — a local public path
//      ("/speakers/dallinhoaks.jpg") or a full "https://…" URL.
//   2. NEXT_PUBLIC_SPEAKER_PHOTO_URL pattern, where "{id}" is the speaker _id:
//        • local files:  "/speakers/{id}.jpg"  (drop images in /public/speakers)
//        • remote CDN:    "https://cdn.example.com/speakers/{id}.jpg"
//          (also add the host to images.remotePatterns in next.config.ts)
//
// Speaker ids look like "dallinhoaks", "jeffreyrholland" (see the API).

export const SPEAKER_PHOTOS: Record<string, string> = {
  // dallinhoaks: "/speakers/dallinhoaks.jpg",
};

const PATTERN = process.env.NEXT_PUBLIC_SPEAKER_PHOTO_URL;

export function speakerPhotoUrl(id: string): string | undefined {
  return (
    SPEAKER_PHOTOS[id] ?? PATTERN?.replace("{id}", encodeURIComponent(id))
  );
}
