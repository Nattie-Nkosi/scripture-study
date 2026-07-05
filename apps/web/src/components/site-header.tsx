import Link from "next/link";

import { Logo } from "@/components/logo";
import { MainNav } from "@/components/main-nav";
import { ThemeSelector } from "@/components/theme-selector";
import { CommandPaletteTrigger } from "@/components/command-palette-trigger";
import { MobileNav } from "@/components/mobile-nav";

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="pt-safe sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-display text-lg font-semibold tracking-tight"
        >
          <Logo className="size-6 text-primary" />
          <span className="sr-only sm:not-sr-only">Scripture Study</span>
        </Link>

        <MainNav />

        <div className="min-w-0 flex-1">{children}</div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-1">
          <CommandPaletteTrigger />
          <ThemeSelector />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
