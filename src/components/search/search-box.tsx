"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";

const VOLUMES = [
  { id: "", label: "All volumes" },
  { id: "oldtestament", label: "Old Testament" },
  { id: "newtestament", label: "New Testament" },
  { id: "bookofmormon", label: "Book of Mormon" },
  { id: "doctrineandcovenants", label: "Doctrine & Covenants" },
  { id: "pearlofgreatprice", label: "Pearl of Great Price" },
];

export function SearchBox({
  initialQuery = "",
  initialVolume = "",
}: {
  initialQuery?: string;
  initialVolume?: string;
}) {
  const router = useRouter();
  const [q, setQ] = React.useState(initialQuery);
  const [volume, setVolume] = React.useState(initialVolume);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    const params = new URLSearchParams({ q: query });
    if (volume) params.set("volume", volume);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the scriptures…"
          autoFocus
          className="w-full rounded-lg border border-input bg-card py-2.5 pr-3 pl-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>
      <select
        value={volume}
        onChange={(e) => setVolume(e.target.value)}
        className="rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        {VOLUMES.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label}
          </option>
        ))}
      </select>
      <Button type="submit" size="lg">
        Search
      </Button>
    </form>
  );
}
