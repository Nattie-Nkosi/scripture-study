export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-14">
      <div className="mx-auto h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="mx-auto mt-4 h-4 w-72 animate-pulse rounded bg-muted/70" />
      <div className="mx-auto mt-10 max-w-2xl space-y-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div
              className="h-4 animate-pulse rounded bg-muted"
              style={{ width: `${70 + ((i * 7) % 25)}%` }}
            />
          </div>
        ))}
      </div>
    </main>
  );
}
