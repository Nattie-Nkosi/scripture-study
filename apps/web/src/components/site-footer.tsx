import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60">
      <div
        className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
        style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
      >
        <p className="max-w-md">
          Scripture text via the Open Scripture API. AI features are study aids,
          not an official source of Church doctrine.
        </p>
        <nav className="flex gap-4">
          <Link href="/read" className="transition-colors hover:text-foreground">
            Library
          </Link>
          <Link href="/talks" className="transition-colors hover:text-foreground">
            Conference
          </Link>
          <Link
            href="/come-follow-me"
            className="transition-colors hover:text-foreground"
          >
            Come, Follow Me
          </Link>
          <Link href="/search" className="transition-colors hover:text-foreground">
            Search
          </Link>
        </nav>
      </div>
    </footer>
  );
}
