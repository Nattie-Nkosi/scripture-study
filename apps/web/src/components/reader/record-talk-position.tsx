"use client";

import * as React from "react";

import { setTalkLastRead } from "@/lib/study/storage";

// The "reading line" below the sticky header: the paragraph whose top has
// scrolled just above this point is the one currently being read.
const READING_LINE = 120;

/** Records the current talk and the paragraph at the top of the viewport so
 *  "Continue talk" can resume where you left off. Renders nothing; writes are
 *  debounced and flushed when the page is hidden or unmounted. Mirrors the
 *  scripture reader's RecordLastRead. */
export function RecordTalkPosition({
  talkId,
  conferenceId,
  title,
  speaker,
}: {
  talkId: string;
  conferenceId: string;
  title: string;
  speaker: string;
}) {
  React.useEffect(() => {
    const hash = /^#p(\d+)$/.exec(window.location.hash);
    let current = hash ? Number(hash[1]) : 1;

    const meta = { talkId, conferenceId, title, speaker };
    void setTalkLastRead({ ...meta, paragraph: current });

    let dirty = false;
    let timer: number | null = null;

    const persist = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
      if (!dirty) return;
      dirty = false;
      void setTalkLastRead({ ...meta, paragraph: current });
    };

    // Paragraphs are in document order, so the last one whose top is above the
    // reading line is the current one — found with a binary search.
    const topParaInView = (): number => {
      const els = document.querySelectorAll<HTMLElement>("[data-paragraph]");
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
      return found >= 0 ? Number(els[found].dataset.paragraph) : 1;
    };

    let frame = 0;
    const measure = () => {
      frame = 0;
      const para = topParaInView();
      if (para !== current) {
        current = para;
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
  }, [talkId, conferenceId, title, speaker]);

  return null;
}
