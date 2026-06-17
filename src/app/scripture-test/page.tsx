import {
  getChapter,
  getVerse,
  searchScriptures,
  ScriptureApiError,
} from "@/lib/scripture/client";

export const metadata = {
  title: "Scripture API test",
};

function errorMessage(err: unknown): string {
  if (err instanceof ScriptureApiError) {
    return `${err.message}${err.status ? ` (HTTP ${err.status})` : ""}`;
  }
  if (err instanceof Error) return err.message;
  return "Unknown error";
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12 first:mt-0">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ErrorBox({ error }: { error: unknown }) {
  return (
    <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      Failed to load: {errorMessage(error)}
    </p>
  );
}

export default async function ScriptureTestPage() {
  const [chapter, verse, search] = await Promise.allSettled([
    getChapter("1nephi", 1),
    getVerse("alma", 32, 21),
    searchScriptures("faith", { limit: 5, highlight: true }),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <header className="border-b pb-6">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Phase 2 · API client smoke test
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Open Scripture API
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verifies the typed client: fetch a chapter, fetch a single verse with
          cross references, and run a keyword search.
        </p>
      </header>

      <Section title="getChapter('1nephi', 1)">
        {chapter.status === "rejected" ? (
          <ErrorBox error={chapter.reason} />
        ) : (
          <article>
            <h3 className="text-lg font-semibold">
              {chapter.value.chapter.bookTitle} —{" "}
              {chapter.value.chapter.delineation} {chapter.value.chapter.number}
            </h3>
            <p className="mt-1 text-sm italic text-muted-foreground">
              {chapter.value.chapter.summary}
            </p>
            <ol className="mt-5 space-y-3">
              {chapter.value.chapter.verses.map((v, i) => (
                <li key={i} className="flex gap-3 leading-relaxed">
                  <span className="select-none pt-0.5 text-xs font-semibold text-muted-foreground">
                    {i + 1}
                  </span>
                  <span>
                    {v.text}
                    {v.footNotes.length > 0 && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({v.footNotes.length} note
                        {v.footNotes.length === 1 ? "" : "s"})
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-xs text-muted-foreground">
              prev: {chapter.value.prevChapterId ?? "—"} · next:{" "}
              {chapter.value.nextChapterId ?? "—"} · volume:{" "}
              {chapter.value.volume.title}
            </p>
          </article>
        )}
      </Section>

      <Section title="getVerse('alma', 32, 21) — cross references">
        {verse.status === "rejected" ? (
          <ErrorBox error={verse.reason} />
        ) : (
          <article>
            <p className="leading-relaxed">
              <span className="font-semibold">{verse.value.reference}</span>{" "}
              {verse.value.text}
            </p>
            <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
              {verse.value.crossReferences.map((ref, i) => (
                <li key={i}>
                  <span className="font-medium text-foreground">
                    {ref.prettyString}
                  </span>{" "}
                  — {ref.references.map((r) => r.type).join(", ")}
                </li>
              ))}
              {verse.value.crossReferences.length === 0 && (
                <li>No cross references.</li>
              )}
            </ul>
          </article>
        )}
      </Section>

      <Section title="searchScriptures('faith', { limit: 5 })">
        {search.status === "rejected" ? (
          <ErrorBox error={search.reason} />
        ) : (
          <article>
            <p className="text-sm text-muted-foreground">
              {search.value.total.toLocaleString()} total matches · showing{" "}
              {search.value.results.length}
            </p>
            <ul className="mt-4 space-y-4">
              {search.value.results.map((r, i) => (
                <li key={i}>
                  <p className="text-sm font-semibold">{r.reference}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.highlight ?? r.text}
                  </p>
                </li>
              ))}
            </ul>
          </article>
        )}
      </Section>
    </main>
  );
}
