"use client";

import * as React from "react";

import { setLastRead } from "@/lib/study/storage";

/** Records the current chapter as the last-read position when the reader opens.
 *  Renders nothing — it exists only to write through the study storage module. */
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
    void setLastRead({ volume, book, chapter, bookTitle });
  }, [volume, book, chapter, bookTitle]);

  return null;
}
