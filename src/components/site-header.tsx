import Link from "next/link";
import { BookOpen, Search } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight"
        >
          <BookOpen className="size-5 text-primary" />
          Scripture Study
        </Link>
        <div className="min-w-0 flex-1">{children}</div>
        <Link
          href="/search"
          aria-label="Search"
          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Search className="size-4" />
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
