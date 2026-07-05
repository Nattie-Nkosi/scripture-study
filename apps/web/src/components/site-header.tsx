import Link from "next/link";

import { Logo } from "@/components/logo";
import { ThemeSelector } from "@/components/theme-selector";
import { CommandPaletteTrigger } from "@/components/command-palette-trigger";
import { MobileNav } from "@/components/mobile-nav";

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="pt-safe sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight"
        >
          <Logo className="size-6 text-primary" />
          Scripture Study
        </Link>
        <div className="min-w-0 flex-1">{children}</div>
        <nav className="flex items-center gap-1.5 sm:gap-1">
          <Link
            href="/read"
            className="hidden rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
          >
            Library
          </Link>
          <Link
            href="/talks"
            className="hidden rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
          >
            Conference
          </Link>
          <Link
            href="/come-follow-me"
            className="hidden rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
          >
            Come, Follow Me
          </Link>
          <Link
            href="/ask"
            className="hidden rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
          >
            Ask
          </Link>
          <Link
            href="/study"
            className="hidden rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
          >
            My study
          </Link>
          <CommandPaletteTrigger />
          <ThemeSelector />
          <MobileNav />
        </nav>
      </div>
    </header>
  );
}
