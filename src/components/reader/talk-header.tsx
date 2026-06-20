import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { ThemeSelector } from "@/components/theme-selector";
import { FontSizeControl } from "@/components/reader/font-size-control";
import { CommandPaletteTrigger } from "@/components/command-palette-trigger";

export function TalkHeader({
  conferenceId,
  conferenceTitle,
}: {
  conferenceId: string;
  conferenceTitle: string;
}) {
  return (
    <header className="pt-safe sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
        <Link
          href={`/talks/${conferenceId}`}
          className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4 shrink-0" />
          <span className="truncate font-serif">{conferenceTitle}</span>
        </Link>
        <div className="flex flex-1 items-center justify-end gap-2">
          <CommandPaletteTrigger iconOnly />
          <FontSizeControl />
          <ThemeSelector />
        </div>
      </div>
    </header>
  );
}
