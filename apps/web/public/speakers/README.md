# Speaker portraits

Drop speaker portrait images in this folder, named by the speaker's API id:

```
public/speakers/dallinhoaks.jpg
public/speakers/jeffreyrholland.jpg
```

Then set the pattern in `.env.local` so they're picked up:

```
NEXT_PUBLIC_SPEAKER_PHOTO_URL="/speakers/{id}.jpg"
```

`{id}` is replaced with the speaker's id (visible in speaker URLs, e.g.
`/talks/speakers/dallinhoaks`). Square images work best (they're cropped to a
circle). Any speaker without an image shows a monogram avatar instead.

## Other sources

- **One-off overrides:** add entries to `SPEAKER_PHOTOS` in
  `src/lib/conference/speaker-photos.ts` (local path or full `https://` URL).
- **Remote CDN:** point the env var at it, e.g.
  `https://cdn.example.com/speakers/{id}.jpg`, and add the host to
  `images.remotePatterns` in `next.config.ts` (required by `next/image`).

Use only images you have the rights to display.
