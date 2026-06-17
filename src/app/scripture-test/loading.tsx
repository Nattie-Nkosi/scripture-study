export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <p className="text-sm text-muted-foreground">Loading scripture…</p>
      <div className="mt-6 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-4 w-full animate-pulse rounded bg-muted"
            style={{ width: `${90 - i * 8}%` }}
          />
        ))}
      </div>
    </main>
  );
}
