export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-16">
      <div className="h-4 w-32 animate-pulse rounded bg-muted/70" />
      <div className="mt-3 h-10 w-72 animate-pulse rounded bg-muted" />
      <div className="mt-8 h-36 animate-pulse rounded-2xl bg-muted" />
      <div className="mt-10 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-muted/70" />
        ))}
      </div>
    </main>
  );
}
