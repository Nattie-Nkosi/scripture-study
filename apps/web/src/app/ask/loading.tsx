export default function Loading() {
  return (
    <main
      className="flex w-full flex-col items-center justify-center gap-3"
      style={{ height: "calc(100dvh - 3.5rem - env(safe-area-inset-top))" }}
    >
      <div className="size-12 animate-pulse rounded-full bg-muted" />
      <div className="h-7 w-56 animate-pulse rounded bg-muted" />
      <div className="h-4 w-72 animate-pulse rounded bg-muted/70" />
    </main>
  );
}
