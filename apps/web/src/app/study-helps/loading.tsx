export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-16">
      <div className="h-4 w-32 animate-pulse rounded bg-muted/70" />
      <div className="mt-3 h-10 w-64 animate-pulse rounded bg-muted" />
      <div className="mt-8 h-11 w-full animate-pulse rounded-lg bg-muted/70" />
      <div className="mt-10 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-8 animate-pulse rounded bg-muted/70" />
        ))}
      </div>
    </main>
  );
}
