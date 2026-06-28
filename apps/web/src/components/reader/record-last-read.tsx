"use client";

import * as React from "react";

import { setLastRead } from "@/lib/study/storage";

// The "reading line" below the sticky header: the verse whose top has scrolled
// just above this point is the one you're currently reading.
const READING_LINE = 120;

/** Records the current reading position — chapter and the verse currently at the
 *  top of the viewport — so "Continue reading" can resume exactly where you left
 *  off. Renders nothing; writes through the study storage module (debounced, and
 *  flushed when the page is hidden or unmounted). */
export function RecordLastRead({
  volume,
  book,
  chapter,
  bookTitle,
}: {
  volume: string;
  book: string;
  chapter: number;
  bookTitle: string;
}) {
  React.useEffect(() => {
    // Seed from a deep-link hash (arrived via Continue reading / a search result),
    // otherwise start at the top of the chapter.
    const hash = /^#v(\d+)$/.exec(window.location.hash);
    let currentVerse = hash ? Number(hash[1]) : 1;

    void setLastRead({ volume, book, chapter, bookTitle, verse: currentVerse });

    let dirty = false;
    let timer: number | null = null;

    const persist = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
      if (!dirty) return;
      dirty = false;
      void setLastRead({ volume, book, chapter, bookTitle, verse: currentVerse });
    };

    // Verses are in document order, so the last one whose top is above the
    // reading line is the current verse — found with a binary search so even a
    // 176-verse chapter costs only a handful of layout reads per scroll frame.
    // Re-queried each frame so it survives the KJV/Simple-English remount.
    const topVerseInView = (): number => {
      const els = document.querySelectorAll<HTMLElement>("[data-verse]");
      let lo = 0;
      let hi = els.length - 1;
      let found = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (els[mid].getBoundingClientRect().top <= READING_LINE) {
          found = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      return found >= 0 ? Number(els[found].dataset.verse) : 1;
    };

    let frame = 0;
    const measure = () => {
      frame = 0;
      const verse = topVerseInView();
      if (verse !== currentVerse) {
        currentVerse = verse;
        dirty = true;
        if (timer === null) timer = window.setTimeout(persist, 800);
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    const onHide = () => {
      if (document.visibilityState === "hidden") persist();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", persist);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", persist);
      if (frame) cancelAnimationFrame(frame);
      persist();
    };
  }, [volume, book, chapter, bookTitle]);

  return null;
}
