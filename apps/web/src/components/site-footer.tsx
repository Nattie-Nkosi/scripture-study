import Link from "next/link";

import { Logo } from "@/components/logo";

const LINKS = [
  { href: "/read", label: "Library" },
  { href: "/talks", label: "Conference" },
  { href: "/come-follow-me", label: "Come, Follow Me" },
  { href: "/study-helps", label: "Study Helps" },
  { href: "/organization", label: "Organization" },
  { href: "/ask", label: "Ask" },
  { href: "/search", label: "Search" },
];

/** A colophon-style footer: the mark and edition line on the left, a compact
 *  contents list on the right, and a baseline with the source note. */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div
        className="mx-auto max-w-5xl px-4 pt-16"
        style={{ paddingBottom: "calc(3rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex flex-col gap-12 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <Logo className="size-5 text-primary" />
              <span className="font-display text-lg font-medium tracking-tight">
                Scripture Study
              </span>
            </div>
            <p className="mt-3 font-serif text-base text-muted-foreground italic">
              A study edition
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="grid max-w-sm grid-cols-2 gap-x-14 gap-y-3"
          >
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="font-serif text-base whitespace-nowrap text-muted-foreground transition-colors duration-(--dur-short) hover:text-foreground"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-md font-serif text-sm leading-relaxed text-muted-foreground text-pretty">
            Scripture text via the Open Scripture API. AI features are study
            aids, not an official source of Church doctrine.
          </p>
          <p className="font-serif text-sm text-muted-foreground">
            © {new Date().getFullYear()} Scripture Study
          </p>
        </div>
      </div>
    </footer>
  );
}
