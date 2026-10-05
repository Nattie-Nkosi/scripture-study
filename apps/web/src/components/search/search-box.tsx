"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CloudOff, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";

const VOLUMES = [
  { id: "", label: "All volumes" },
  { id: "oldtestament", label: "Old Testament" },
  { id: "newtestament", label: "New Testament" },
  { id: "bookofmormon", label: "Book of Mormon" },
  { id: "doctrineandcovenants", label: "Doctrine & Covenants" },
  { id: "pearlofgreatprice", label: "Pearl of Great Price" },
];

type Scope = "scripture" | "talks" | "study-helps";

export function SearchBox({
  initialQuery = "",
  initialVolume = "",
  initialScope = "scripture",
}: {
  initialQuery?: string;
  initialVolume?: string;
  initialScope?: Scope;
}) {
  const router = useRouter();
  const online = useOnlineStatus();
  const [q, setQ] = React.useState(initialQuery);
  const [volume, setVolume] = React.useState(initialVolume);
  const [scope, setScope] = React.useState<Scope>(initialScope);

  function urlFor(query: string, nextScope: Scope) {
    const params = new URLSearchParams({ q: query });
    if (nextScope === "talks") {
      params.set("scope", "talks");
    } else if (nextScope === "study-helps") {
      params.set("scope", "study-helps");
    } else if (volume) {
      params.set("volume", volume);
    }
    return `/search?${params.toString()}`;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query || !online) return;
    router.push(urlFor(query, scope));
  }

  function pickScope(next: Scope) {
    setScope(next);
    const query = q.trim();
    if (query && online) router.push(urlFor(query, next));
  }

  return (
    <div>
      {!online && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-border bg-amber-500/10 px-3 py-2 text-sm text-foreground/80">
          <CloudOff className="mt-0.5 size-4 shrink-0" />
          <p>
            Search needs a connection. You’re offline right now — chapters and
            talks you’ve already opened are still available to read.
          </p>
        </div>
      )}

      <div className="mb-4 flex w-fit items-center gap-5">
        {(
          [
            ["scripture", "Scriptures"],
            ["talks", "Conference"],
            ["study-helps", "Study Helps"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => pickScope(value)}
            aria-pressed={scope === value}
            disabled={!online}
            className={cn(
              "eyebrow border-b pb-0.5 transition-colors disabled:opacity-50",
              scope === value
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <Search strokeWidth={1.5} className="pointer-events-none absolute top-1/2 left-0.5 size-4.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              !online
                ? "Search is offline…"
                : scope === "talks"
                  ? "Search conference talks…"
                  : scope === "study-helps"
                    ? "Search the study helps…"
                    : "Search the scriptures…"
            }
            autoFocus
            disabled={!online}
            className="w-full border-0 border-b border-border bg-transparent py-3 pr-3 pl-8 font-serif text-xl outline-none transition-colors placeholder:text-muted-foreground/60 placeholder:italic focus-visible:border-primary disabled:opacity-50"
          />
        </div>
        {scope === "scripture" && (
          <select
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            disabled={!online}
            className="border-0 border-b border-border bg-transparent px-1 py-3 font-serif text-base outline-none transition-colors focus-visible:border-primary disabled:opacity-50"
          >
            {VOLUMES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        )}
        <Button type="submit" variant="outline" size="lg" disabled={!online} className="font-serif">
          Search
        </Button>
      </form>
    </div>
  );
}
