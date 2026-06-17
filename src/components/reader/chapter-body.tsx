"use client";

import * as React from "react";
import { Loader2, Sparkles, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useDeviceId } from "@/lib/hooks/use-device-id";
import { translateChapterAction } from "@/lib/actions/translate";
import { loadAnnotations, saveAnnotation } from "@/lib/actions/annotations";

type Verse = { n: number; text: string };
type Annotation = { color: string | null; note: string | null };
type AnnMap = Record<number, Annotation>;

const HIGHLIGHTS = [
  { key: "yellow", label: "Yellow", swatch: "bg-yellow-300", text: "bg-yellow-200/70 dark:bg-yellow-300/20" },
  { key: "green", label: "Green", swatch: "bg-green-300", text: "bg-green-200/70 dark:bg-green-300/20" },
  { key: "blue", label: "Blue", swatch: "bg-sky-300", text: "bg-sky-200/70 dark:bg-sky-300/20" },
  { key: "pink", label: "Pink", swatch: "bg-pink-300", text: "bg-pink-200/70 dark:bg-pink-300/20" },
];

function highlightClass(color: string | null): string {
  return HIGHLIGHTS.find((h) => h.key === color)?.text ?? "";
}

export function ChapterBody({
  volume,
  book,
  chapter,
  kjvVerses,
}: {
  volume: string;
  book: string;
  chapter: number;
  kjvVerses: Verse[];
}) {
  const deviceId = useDeviceId();

  const [mode, setMode] = React.useState<"kjv" | "simple">("kjv");
  const [simple, setSimple] = React.useState<Verse[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [ann, setAnn] = React.useState<AnnMap>({});
  const [selected, setSelected] = React.useState<number | null>(null);
  const [noteDraft, setNoteDraft] = React.useState("");

  React.useEffect(() => {
    if (!deviceId) return;
    loadAnnotations(deviceId, volume, book, chapter)
      .then((rows) => {
        const next: AnnMap = {};
        for (const r of rows) next[r.verse] = { color: r.color, note: r.note };
        setAnn(next);
      })
      .catch(() => {});
  }, [deviceId, volume, book, chapter]);

  const loadSimple = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await translateChapterAction(volume, book, chapter);
    setLoading(false);
    if (res.ok) setSimple(res.verses);
    else setError(res.error);
  }, [volume, book, chapter]);

  function showSimple() {
    setMode("simple");
    if (!simple && !loading) void loadSimple();
  }

  function persist(n: number, color: string | null, note: string | null) {
    if (!deviceId) return;
    void saveAnnotation(deviceId, volume, book, chapter, n, color, note);
  }

  function applyColor(n: number, color: string | null) {
    const cur = ann[n] ?? { color: null, note: null };
    setAnn({ ...ann, [n]: { color, note: cur.note } });
    persist(n, color, cur.note);
  }

  function saveNote(n: number) {
    const cur = ann[n] ?? { color: null, note: null };
    const note = noteDraft.trim() || null;
    setAnn({ ...ann, [n]: { color: cur.color, note } });
    persist(n, cur.color, note);
    setSelected(null);
  }

  function toggleSelect(n: number) {
    if (selected === n) {
      setSelected(null);
      return;
    }
    setSelected(n);
    setNoteDraft(ann[n]?.note ?? "");
  }

  const verses = mode === "simple" && simple ? simple : kjvVerses;

  return (
    <div className="mt-8">
      <div className="mx-auto flex w-fit items-center rounded-full border border-border bg-card p-0.5 text-sm">
        <button
          type="button"
          onClick={() => setMode("kjv")}
          aria-pressed={mode === "kjv"}
          className={cn(
            "rounded-full px-4 py-1.5 font-sans font-medium transition-colors",
            mode === "kjv"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          King James
        </button>
        <button
          type="button"
          onClick={showSimple}
          aria-pressed={mode === "simple"}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-4 py-1.5 font-sans font-medium transition-colors",
            mode === "simple"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Sparkles className="size-3.5" />
          Simple English
        </button>
      </div>

      {mode === "simple" && loading ? (
        <TranslatingState />
      ) : mode === "simple" && error && !simple ? (
        <div className="mx-auto mt-10 max-w-2xl rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-5 text-center text-sm text-destructive">
          <p>{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={loadSimple}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <div className="reader-prose mx-auto mt-8 max-w-2xl space-y-3 font-serif">
            {verses.map((v) => {
              const a = ann[v.n];
              const isSelected = selected === v.n;
              return (
                <div key={v.n} id={`v${v.n}`} className="scroll-mt-24">
                  <p className="text-foreground/90">
                    <button
                      type="button"
                      onClick={() => toggleSelect(v.n)}
                      aria-label={`Verse ${v.n} options`}
                      className={cn(
                        "mr-1.5 cursor-pointer align-baseline font-sans text-[0.62em] font-semibold tabular-nums transition-colors",
                        isSelected
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {v.n}
                    </button>
                    <span className={cn("rounded px-0.5", highlightClass(a?.color ?? null))}>
                      {v.text}
                    </span>
                  </p>

                  {isSelected && (
                    <VerseToolbar
                      annotation={a}
                      noteDraft={noteDraft}
                      onColor={(c) => applyColor(v.n, c)}
                      onNoteChange={setNoteDraft}
                      onSave={() => saveNote(v.n)}
                      onClose={() => setSelected(null)}
                    />
                  )}

                  {!isSelected && a?.note && (
                    <p className="mt-1 ml-5 font-sans text-sm text-muted-foreground">
                      <span className="mr-1 font-medium text-foreground/80">Note:</span>
                      {a.note}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {mode === "simple" && simple && (
            <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-muted-foreground">
              <Sparkles className="mr-1 inline size-3 align-[-0.1em]" />
              AI-simplified paraphrase for readability — compare with the King
              James text for study.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function VerseToolbar({
  annotation,
  noteDraft,
  onColor,
  onNoteChange,
  onSave,
  onClose,
}: {
  annotation: Annotation | undefined;
  noteDraft: string;
  onColor: (color: string | null) => void;
  onNoteChange: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="my-2.5 ml-5 max-w-md rounded-lg border border-border bg-card p-2.5 font-sans">
      <div className="flex items-center gap-1.5">
        {HIGHLIGHTS.map((h) => (
          <button
            key={h.key}
            type="button"
            onClick={() => onColor(h.key)}
            aria-label={`Highlight ${h.label}`}
            className={cn(
              "size-6 rounded-full border border-black/10",
              h.swatch,
              annotation?.color === h.key && "ring-2 ring-ring ring-offset-1",
            )}
          />
        ))}
        <button
          type="button"
          onClick={() => onColor(null)}
          aria-label="Remove highlight"
          className="flex size-6 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground"
        >
          Done
        </button>
      </div>

      <textarea
        value={noteDraft}
        onChange={(e) => onNoteChange(e.target.value)}
        placeholder="Add a note…"
        rows={2}
        className="mt-2 w-full resize-none rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
      />
      <div className="mt-1.5 flex justify-end">
        <Button size="sm" onClick={onSave}>
          Save note
        </Button>
      </div>
    </div>
  );
}

function TranslatingState() {
  return (
    <div className="mx-auto mt-10 max-w-2xl">
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Simplifying this chapter…
      </div>
      <div className="mt-6 space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div
              className="h-4 animate-pulse rounded bg-muted"
              style={{ width: `${68 + ((i * 9) % 28)}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
