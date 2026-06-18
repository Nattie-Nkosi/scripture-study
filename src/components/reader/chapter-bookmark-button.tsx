"use client";

import * as React from "react";
import { Bookmark as BookmarkIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  deleteBookmark,
  getBookmarks,
  saveBookmark,
  type Bookmark,
} from "@/lib/study/storage";

/** Chapter-level bookmark toggle for the reader header (verse === null). */
export function ChapterBookmarkButton({
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
  const [bookmark, setBookmark] = React.useState<Bookmark | null>(null);

  React.useEffect(() => {
    let active = true;
    getBookmarks()
      .then((all) => {
        if (!active) return;
        const found =
          all.find(
            (b) =>
              b.verse === null &&
              b.volume === volume &&
              b.book === book &&
              b.chapter === chapter,
          ) ?? null;
        setBookmark(found);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [volume, book, chapter]);

  function toggle() {
    if (bookmark) {
      void deleteBookmark(bookmark.id);
      setBookmark(null);
      return;
    }
    void saveBookmark({ volume, book, chapter, verse: null, bookTitle }).then(setBookmark);
  }

  const active = !!bookmark;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={active ? "Remove chapter bookmark" : "Bookmark this chapter"}
      aria-pressed={active}
      className={cn(
        "flex size-7 items-center justify-center rounded-lg transition-colors",
        active
          ? "text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <BookmarkIcon className={cn("size-4", active && "fill-current")} />
    </button>
  );
}
