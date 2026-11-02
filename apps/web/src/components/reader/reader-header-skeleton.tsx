/** Holds the reader header's height and rule while a chapter or talk loads, so
 *  the page doesn't jump when the real header (which needs the data) arrives. */
export function ReaderHeaderSkeleton() {
  return (
    <div aria-hidden className="pt-safe sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
