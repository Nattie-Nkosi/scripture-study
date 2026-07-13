import Link from "next/link";

import { Logo } from "@/components/logo";

const LINKS = [
  { href: "/read", label: "Library" },
  { href: "/talks", label: "Conference" },
  { href: "/come-follow-me", label: "Come, Follow Me" },
  { href: "/study-helps", label: "Study Helps" },
  { href: "/ask", label: "Ask" },
  { href: "/search", label: "Search" },
];

/** A colophon-style footer: the mark and edition line on the left, a compact
 *  contents list on the right, and a baseline with the source note beside the
 *  garnet diamond that recurs through the app. */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60">
      <div
        className="mx-auto max-w-5xl px-4 py-12"
        style={{ paddingBottom: "calc(3rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <Logo className="size-5 text-primary" />
              <span className="font-display text-base font-semibold tracking-tight">
                Scripture Study
              </span>
            </div>
            <p className="mt-2.5 small-caps text-xs text-muted-foreground">
              A study edition
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="grid max-w-xs grid-cols-2 gap-x-12 gap-y-3"
          >
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-border/60 pt-6 sm:flex-row sm:items-start sm:justify-between">
          <p className="flex max-w-md items-start gap-3 font-serif text-xs leading-relaxed text-muted-foreground text-pretty">
            <span
              aria-hidden
              className="mt-1 size-1.5 shrink-0 rotate-45 bg-primary/45"
            />
            Scripture text via the Open Scripture API. AI features are study
            aids, not an official source of Church doctrine.
          </p>
          <p className="small-caps text-xs text-muted-foreground">
            © {new Date().getFullYear()} Scripture Study
          </p>
        </div>
      </div>
    </footer>
  );
}
