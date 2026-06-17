export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16">
      <div className="h-9 w-64 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-4 w-48 animate-pulse rounded bg-muted/70" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </main>
  );
}
