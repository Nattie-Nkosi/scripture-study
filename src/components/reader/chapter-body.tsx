"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Loader2, Sparkles, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useDeviceId } from "@/lib/hooks/use-device-id";
import { translateChapterAction } from "@/lib/actions/translate";
import { loadAnnotations, saveAnnotation } from "@/lib/actions/annotations";
import { parseFootnoteReferences, previewVerse } from "@/lib/actions/footnotes";
import type { FootNote, ParsedReference } from "@/lib/scripture/types";

type RefState = { status: "loading" | "done"; refs: ParsedReference[] };
type PreviewState = {
  status: "loading" | "done" | "error";
  reference?: string;
  text?: string;
};

type Verse = { n: number; text: string };
type KjvVerse = { n: number; text: string; footNotes: FootNote[] };
type Annotation = { color: string | null; note: string | null };
type AnnMap = Record<number, Annotation>;

/** Footnote marker letters: a–z, then aa, ab, … for verses with many notes. */
function markerLetter(index: number): string {
  let i = index + 1;
  let s = "";
  while (i > 0) {
    i--;
    s = String.fromCharCode(97 + (i % 26)) + s;
    i = Math.floor(i / 26);
  }
  return s;
}

/** Interleave the verse text with subtle superscript markers placed at each
 *  footnote's start offset (immediately before the annotated word). Markers are
 *  buttons that open the footnote panel. */
function renderVerseText(
  text: string,
  footNotes: FootNote[],
  onMarkerClick: (index: number) => void,
  activeIndex: number | null,
): React.ReactNode {
  if (!footNotes || footNotes.length === 0) return text;

  const markers = footNotes
    .map((f, i) => ({ start: f.start, index: i, letter: markerLetter(i) }))
    .sort((a, b) => a.start - b.start);

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  markers.forEach((m) => {
    const at = Math.max(0, Math.min(m.start, text.length));
    if (at > cursor) nodes.push(text.slice(cursor, at));
    nodes.push(
      <button
        key={`fn-${m.index}`}
        type="button"
        onClick={() => onMarkerClick(m.index)}
        aria-label={`Footnote ${m.letter}`}
        className={cn(
          "cursor-pointer select-none px-0.5 align-super font-sans text-[0.58em] font-medium transition-colors",
          activeIndex === m.index
            ? "text-primary underline decoration-primary/40 underline-offset-2"
            : "text-primary/55 hover:text-primary",
        )}
      >
        {m.letter}
      </button>,
    );
    cursor = at;
  });
  nodes.push(text.slice(cursor));
  return nodes;
}

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
  kjvVerses: KjvVerse[];
}) {
  const deviceId = useDeviceId();

  const [mode, setMode] = React.useState<"kjv" | "simple">("kjv");
  const [simple, setSimple] = React.useState<Verse[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [ann, setAnn] = React.useState<AnnMap>({});
  const [selected, setSelected] = React.useState<number | null>(null);
  const [noteDraft, setNoteDraft] = React.useState("");

  const [openFootnote, setOpenFootnote] = React.useState<{
    verse: number;
    index: number;
  } | null>(null);
  const [refCache, setRefCache] = React.useState<Record<string, RefState>>({});

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
    setOpenFootnote(null); // markers/panel are KJV-only
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
    setOpenFootnote(null);
    if (selected === n) {
      setSelected(null);
      return;
    }
    setSelected(n);
    setNoteDraft(ann[n]?.note ?? "");
  }

  function openNote(verse: number, index: number, text: string) {
    setSelected(null);
    setOpenFootnote({ verse, index });
    if (refCache[text] === undefined) {
      setRefCache((prev) => ({ ...prev, [text]: { status: "loading", refs: [] } }));
      parseFootnoteReferences(text)
        .then((refs) =>
          setRefCache((prev) => ({ ...prev, [text]: { status: "done", refs } })),
        )
        .catch(() =>
          setRefCache((prev) => ({
            ...prev,
            [text]: { status: "done", refs: [] },
          })),
        );
    }
  }

  const showingSimple = mode === "simple" && !!simple;
  const verses: Array<Verse | KjvVerse> = showingSimple ? simple! : kjvVerses;

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
          <div
            key={showingSimple ? "simple" : "kjv"}
            className="reader-prose mx-auto mt-8 max-w-2xl space-y-3 font-serif animate-in fade-in duration-300"
          >
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
                          : "text-primary/45 hover:text-primary",
                      )}
                    >
                      {v.n}
                    </button>
                    <span className={cn("rounded px-0.5 transition-colors", highlightClass(a?.color ?? null))}>
                      {showingSimple
                        ? v.text
                        : renderVerseText(
                            v.text,
                            (v as KjvVerse).footNotes,
                            (index) =>
                              openNote(
                                v.n,
                                index,
                                (v as KjvVerse).footNotes[index].text,
                              ),
                            openFootnote?.verse === v.n
                              ? openFootnote.index
                              : null,
                          )}
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

                  {!showingSimple &&
                    openFootnote?.verse === v.n &&
                    (v as KjvVerse).footNotes[openFootnote.index] && (
                      <FootnotePanel
                        key={`fn-${v.n}-${openFootnote.index}`}
                        letter={markerLetter(openFootnote.index)}
                        text={(v as KjvVerse).footNotes[openFootnote.index].text}
                        refsState={
                          refCache[
                            (v as KjvVerse).footNotes[openFootnote.index].text
                          ]
                        }
                        onClose={() => setOpenFootnote(null)}
                      />
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
    <div className="my-2.5 ml-5 max-w-md rounded-lg border border-border bg-card p-2.5 font-sans animate-in fade-in slide-in-from-top-1 duration-200">
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

function FootnotePanel({
  letter,
  text,
  refsState,
  onClose,
}: {
  letter: string;
  text: string;
  refsState: RefState | undefined;
  onClose: () => void;
}) {
  const [activeKey, setActiveKey] = React.useState<string | null>(null);
  const [previews, setPreviews] = React.useState<Record<string, PreviewState>>(
    {},
  );

  const refKey = (r: ParsedReference) => `${r.book}-${r.chapter}-${r.verse}`;

  function fetchPreview(r: ParsedReference) {
    const key = refKey(r);
    setPreviews((p) => ({ ...p, [key]: { status: "loading" } }));
    previewVerse(r.book, r.chapter, r.verse)
      .then((res) =>
        setPreviews((p) => ({
          ...p,
          [key]: res.ok
            ? { status: "done", reference: res.reference, text: res.text }
            : { status: "error" },
        })),
      )
      .catch(() =>
        setPreviews((p) => ({ ...p, [key]: { status: "error" } })),
      );
  }

  function selectRef(r: ParsedReference) {
    const key = refKey(r);
    if (activeKey === key) {
      setActiveKey(null);
      return;
    }
    setActiveKey(key);
    const cur = previews[key];
    if (!cur || cur.status === "error") fetchPreview(r);
  }

  const active = refsState?.refs.find((r) => refKey(r) === activeKey) ?? null;
  const preview = activeKey ? previews[activeKey] : undefined;

  return (
    <div className="my-2.5 ml-5 max-w-md rounded-lg border border-border bg-card p-3 font-sans text-sm animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Footnote {letter}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close footnote"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <p className="leading-relaxed text-foreground/90">{text}</p>

      {refsState?.status === "loading" && (
        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Finding cross references…
        </p>
      )}

      {refsState?.status === "done" && refsState.refs.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Cross references
          </p>
          <div className="flex flex-wrap gap-1.5">
            {refsState.refs.map((r) => {
              const key = refKey(r);
              const isActive = activeKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectRef(r)}
                  aria-expanded={isActive}
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-xs transition-colors",
                    isActive
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-border bg-background text-foreground/80 hover:border-primary/40 hover:bg-accent/40",
                  )}
                >
                  {r.prettyString}
                </button>
              );
            })}
          </div>

          {active && (
            <div className="mt-2.5 rounded-md border border-border bg-background p-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
              {preview?.status === "loading" && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" /> Loading{" "}
                  {active.prettyString}…
                </p>
              )}
              {preview?.status === "error" && (
                <p className="text-xs text-destructive">
                  Couldn’t load {active.prettyString}.{" "}
                  <button
                    type="button"
                    onClick={() => fetchPreview(active)}
                    className="underline"
                  >
                    Retry
                  </button>
                </p>
              )}
              {preview?.status === "done" && (
                <>
                  <p className="font-serif leading-relaxed text-foreground/90">
                    <span className="font-semibold">{preview.reference} </span>
                    {preview.text}
                  </p>
                  {active.volume && (
                    <Link
                      href={`/read/${active.volume}/${active.book}/${active.chapter}#v${active.verse}`}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Open <ArrowUpRight className="size-3.5" />
                    </Link>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
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
