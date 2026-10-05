import Link from "next/link";

import { Logo } from "@/components/logo";
import { MainNav } from "@/components/main-nav";
import { ThemeSelector } from "@/components/theme-selector";
import { CommandPaletteTrigger } from "@/components/command-palette-trigger";
import { MobileNav } from "@/components/mobile-nav";

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="pt-safe sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5"
        >
          <Logo className="size-5 text-primary transition-transform duration-500 group-hover:-rotate-6" />
          <span className="font-display text-[1.0625rem] font-medium tracking-tight">
            <span className="sr-only sm:not-sr-only">Scripture Study</span>
          </span>
        </Link>

        <MainNav />

        <div className="min-w-0 flex-1 lg:invisible">{children}</div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-1">
          <CommandPaletteTrigger />
          <ThemeSelector />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
