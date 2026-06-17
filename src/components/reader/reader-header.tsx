import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { FontSizeControl } from "@/components/reader/font-size-control";

export function ReaderHeader({
  volumeId,
  bookId,
  bookTitle,
}: {
  volumeId: string;
  bookId: string;
  bookTitle: string;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
        <Link
          href={`/read/${volumeId}/${bookId}`}
          className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4 shrink-0" />
          <span className="truncate font-serif">{bookTitle}</span>
        </Link>
        <div className="flex flex-1 items-center justify-end gap-2">
          <FontSizeControl />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
