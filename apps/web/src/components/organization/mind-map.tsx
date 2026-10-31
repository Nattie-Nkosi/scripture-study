"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronRight, Minus, Plus, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { ORGANIZATION, scriptureHref, type OrgNode } from "@/lib/organization/data";

const byId = new Map<string, OrgNode>();
const parentOf = new Map<string, string>();
(function index(node: OrgNode) {
  byId.set(node.id, node);
  for (const child of node.children ?? []) {
    parentOf.set(child.id, node.id);
    index(child);
  }
})(ORGANIZATION);

const ROOT = ORGANIZATION.id;

const ALL_BRANCHES = [...byId.values()]
  .filter((n) => n.children?.length)
  .map((n) => n.id);

const CALLING_COUNT = byId.size - 1;
const SECTION_COUNT = new Set([...byId.values()].map((n) => n.section).filter(Boolean)).size;

const LEVEL_LABELS: Record<string, string> = {
  general: "General",
  area: "Area",
  stake: "Stake",
  ward: "Ward",
  members: "Home",
};
const NUMERALS = ["I", "II", "III", "IV", "V"];

const TIERS = (ORGANIZATION.children ?? [])
  .filter((n) => LEVEL_LABELS[n.id])
  .map((node, i) => ({ node, label: LEVEL_LABELS[node.id], numeral: NUMERALS[i] }));

type Tier = (typeof TIERS)[number];

function pathTo(id: string): OrgNode[] {
  const path: OrgNode[] = [];
  for (let cur: string | undefined = id; cur; cur = parentOf.get(cur)) {
    path.unshift(byId.get(cur)!);
  }
  return path;
}

function tierOf(id: string): Tier | undefined {
  const top = pathTo(id)[1];
  return top ? TIERS.find((t) => t.node.id === top.id) : undefined;
}

function siblingsOf(id: string): OrgNode[] {
  const parent = parentOf.get(id);
  return parent ? (byId.get(parent)!.children ?? []) : [];
}

/** The chain of callings a calling serves under, from Christ down to the calling itself. */
function lineOf(id: string): OrgNode[] {
  const line: OrgNode[] = [];
  for (let cur: string | undefined = id; cur && line.length < 20; cur = byId.get(cur)?.under) {
    line.unshift(byId.get(cur)!);
  }
  return line;
}

const nameOf = (node: OrgNode) => (node.id === ROOT ? "Jesus Christ" : node.title);

const SEARCH_INDEX = [...byId.values()]
  .filter((n) => n.id !== ROOT)
  .map((node) => ({
    node,
    title: node.title.toLowerCase(),
    rest: [node.tagline, node.summary, ...(node.duties ?? [])].join(" ").toLowerCase(),
  }));

function searchCallings(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return SEARCH_INDEX.map((entry) => ({
    node: entry.node,
    score: entry.title.startsWith(q) ? 3 : entry.title.includes(q) ? 2 : entry.rest.includes(q) ? 1 : 0,
  }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 7)
    .map((r) => r.node);
}

/* The selection lives in the URL (?c=bishopric&vs=relief-society&line=1) so any view can be
 * shared and Back walks through past selections. useSyncExternalStore reads it; writes go
 * through history and announce themselves with VIEW_EVENT. */
type View = { c: string; vs: string | null; line: boolean };

const VIEW_EVENT = "org-view-change";

function subscribeToUrl(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(VIEW_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(VIEW_EVENT, onChange);
  };
}

function parseView(search: string): View {
  const params = new URLSearchParams(search);
  const c = params.get("c");
  const vs = params.get("vs");
  return {
    c: c && byId.has(c) ? c : ROOT,
    vs: vs && byId.has(vs) && vs !== ROOT ? vs : null,
    line: params.get("line") === "1",
  };
}

let lastWrite = 0;

/** Rapid changes (arrow keys, typing) replace the history entry rather than piling up. */
function writeView(view: View) {
  const params = new URLSearchParams(window.location.search);
  for (const key of ["c", "vs", "line"]) params.delete(key);
  if (view.c !== ROOT) params.set("c", view.c);
  if (view.vs) params.set("vs", view.vs);
  if (view.line) params.set("line", "1");
  const qs = params.toString();
  const url = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
  if (url === window.location.pathname + window.location.search) return;

  const now = Date.now();
  if (now - lastWrite < 700) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
  lastWrite = now;
  window.dispatchEvent(new Event(VIEW_EVENT));
}

function expansionFor(view: View): Set<string> {
  const ids = view.line ? lineOf(view.c).map((n) => n.id) : [view.c];
  return new Set(
    ids
      .flatMap((id) => pathTo(id))
      .filter((n) => n.children?.length)
      .map((n) => n.id),
  );
}

function scrollToNode(id: string, block: ScrollLogicalPosition, focus = false) {
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>(`[data-node-id="${id}"]`);
    if (!el) return;
    el.scrollIntoView({ block, inline: "center", behavior: "smooth" });
    if (focus) el.focus({ preventScroll: true });
  });
}

type Actions = {
  view: View;
  select: (id: string, focus?: boolean) => void;
  setLine: (on: boolean) => void;
  compareWith: (id: string | null) => void;
};

type MapState = {
  expanded: Set<string>;
  selected: string;
  onPath: Set<string>;
  inLine: Set<string>;
  toggle: (id: string) => void;
  actions: Actions;
};

type StaggerStyle = React.CSSProperties & { "--i"?: number };

export function OrgMindMap() {
  const search = React.useSyncExternalStore(
    subscribeToUrl,
    () => window.location.search,
    () => "",
  );
  const view = React.useMemo(() => parseView(search), [search]);
  const viewKey = `${view.c}|${view.line}`;

  // Manual expand/collapse holds only until the selection or trace changes.
  const [manual, setManual] = React.useState<{ key: string; set: Set<string> } | null>(null);
  const autoExpanded = React.useMemo(() => expansionFor(view), [view]);
  const expanded = manual?.key === viewKey ? manual.set : autoExpanded;

  const path = React.useMemo(() => pathTo(view.c), [view.c]);
  const onPath = React.useMemo(() => new Set(path.map((n) => n.id)), [path]);
  const line = React.useMemo(() => (view.line ? lineOf(view.c) : []), [view.c, view.line]);
  const inLine = React.useMemo(() => new Set(line.map((n) => n.id)), [line]);

  const deepLinked = React.useRef(false);
  React.useEffect(() => {
    deepLinked.current = new URLSearchParams(window.location.search).has("c");
  }, []);
  React.useEffect(() => {
    if (!deepLinked.current || view.c === ROOT) return;
    deepLinked.current = false;
    scrollToNode(view.c, "center");
  }, [view.c]);

  const actions: Actions = {
    view,
    select: (id, focus = false) => {
      writeView({ ...view, c: id });
      scrollToNode(id, "nearest", focus);
    },
    setLine: (on) => writeView({ ...view, line: on }),
    compareWith: (id) => writeView({ ...view, vs: id }),
  };

  const toggle = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setManual({ key: viewKey, set: next });
  };

  const state: MapState = { expanded, selected: view.c, onPath, inLine, toggle, actions };
  const current = byId.get(view.c)!;
  const pinned = view.vs ? byId.get(view.vs)! : null;
  const activeTier = path[1]?.id;

  return (
    <div>
      <section className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="max-w-2xl">
          <h1
            className="org-rise font-display text-5xl font-light tracking-tight sm:text-6xl"
            style={{ "--i": 1 } as StaggerStyle}
          >
            Church Organization
            <span className="mt-2 block text-[0.5em] leading-tight">Who serves where</span>
          </h1>
          <p
            className="org-rise mt-4 font-serif text-lg leading-relaxed text-muted-foreground text-pretty"
            style={{ "--i": 2 } as StaggerStyle}
          >
            A map of the Church&apos;s leaders and members, from the First Presidency to your
            ward and home. Select any calling to see what it does, who it serves under, and the
            scriptures and handbook sections behind it.
          </p>
          <p
            className="org-rise eyebrow mt-6 text-muted-foreground"
            style={{ "--i": 3 } as StaggerStyle}
          >
            {TIERS.length} levels, {CALLING_COUNT} callings and roles, {SECTION_COUNT} handbook
            sections
          </p>
        </div>

        <div className="hidden justify-center sm:flex">
          <Emblem path={path} line={line} onSelect={actions.select} />
        </div>
      </section>

      <div className="mt-16 grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-end gap-x-8 gap-y-4 border-b border-border pb-4">
            <FindCalling onPick={(id) => actions.select(id, true)} />

            <nav aria-label="Levels" className="flex flex-wrap gap-x-5 gap-y-1">
              {TIERS.map((tier) => (
                <button
                  key={tier.node.id}
                  type="button"
                  onClick={() => actions.select(tier.node.id)}
                  aria-pressed={activeTier === tier.node.id}
                  className={cn(
                    "org-tab font-serif text-[0.95rem] transition-colors",
                    activeTier === tier.node.id
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="mr-1.5 text-xs text-primary tabular-nums">{tier.numeral}</span>
                  {tier.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-4 font-serif text-sm text-muted-foreground sm:ml-auto">
              <button
                type="button"
                onClick={() => setManual({ key: viewKey, set: new Set(ALL_BRANCHES) })}
                className="transition-colors hover:text-primary"
              >
                Expand all
              </button>
              <span aria-hidden className="size-1 rotate-45 bg-border" />
              <button
                type="button"
                onClick={() => {
                  setManual(null);
                  writeView({ ...view, c: ROOT, line: false });
                }}
                className="transition-colors hover:text-primary"
              >
                Collapse
              </button>
            </div>
          </div>

          {pinned && (
            <CompareBar pinned={pinned} current={current} onClear={() => actions.compareWith(null)} />
          )}

          <div className="overflow-x-auto rounded-xl border border-border bg-card/40 p-4 sm:p-6">
            <ul className="mindmap">
              <Branch node={ORGANIZATION} depth={0} index={0} state={state} />
            </ul>
          </div>

          <p className="mt-3 hidden font-serif text-xs text-muted-foreground italic sm:block">
            Arrow keys move through the map; press / to search.
          </p>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <NodeDetail node={current} path={path} actions={actions} />
          </div>
        </aside>
      </div>

      {pinned && pinned.id !== current.id && current.id !== ROOT && (
        <Comparison
          key={`${pinned.id}|${current.id}`}
          a={pinned}
          b={current}
          onSelect={actions.select}
          onSwap={() => writeView({ ...view, c: pinned.id, vs: current.id })}
          onClose={() => actions.compareWith(null)}
        />
      )}
    </div>
  );
}

const C = 200;
const ringR = (tierIndex: number) => 70 + tierIndex * 28;

/** Where a level's callings sit on its ring: fanned clockwise from below the ring's label,
 *  leaving the top arc clear for the label itself. */
function stationPoint(tierIndex: number, k: number, count: number) {
  const spread = 280;
  const start = -90 + (360 - spread) / 2;
  const deg = start + (count > 1 ? (k * spread) / (count - 1) : spread / 2);
  return polar(ringR(tierIndex), deg);
}

function polar(r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { r, deg, x: C + r * Math.cos(rad), y: C + r * Math.sin(rad) };
}

type Stop = ReturnType<typeof polar>;

/** A node's place on the emblem: the center for the Church, otherwise the station of its
 *  level-two ancestor (deeper callings share their parent's station). */
function emblemPoint(id: string): Stop {
  if (id === ROOT) return polar(0, 0);
  const path = pathTo(id);
  const tierIndex = TIERS.findIndex((t) => t.node.id === path[1].id);
  const stations = TIERS[tierIndex].node.children ?? [];
  const station = path[2] ? stations.findIndex((s) => s.id === path[2].id) : -1;
  if (station < 0) return polar(ringR(tierIndex), -90);
  return stationPoint(tierIndex, station, stations.length);
}

/** Routes between stops the way an astrolabe would be read: out along a radius to the next
 *  ring, then around that ring's arc (the short way) to the station. */
function tracePath(stops: Stop[]): string {
  let d = `M ${stops[0].x} ${stops[0].y}`;
  for (let i = 1; i < stops.length; i++) {
    const from = stops[i - 1];
    const to = stops[i];
    const turnAt = polar(to.r, from.r === 0 ? to.deg : from.deg);
    d += ` L ${turnAt.x} ${turnAt.y}`;
    const delta = ((to.deg - turnAt.deg + 540) % 360) - 180;
    if (Math.abs(delta) > 0.01) d += ` A ${to.r} ${to.r} 0 0 ${delta > 0 ? 1 : 0} ${to.x} ${to.y}`;
  }
  return d;
}

const diamond = (x: number, y: number, s: number) =>
  `M ${x} ${y - s} L ${x + s} ${y} L ${x} ${y + s} L ${x - s} ${y} Z`;

/** Concentric rings, read from the center out: Christ, then each level of the Church. */
function Emblem({
  path,
  line,
  onSelect,
}: {
  path: OrgNode[];
  line: OrgNode[];
  onSelect: (id: string) => void;
}) {
  const onKey = (id: string) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      onSelect(id);
    }
  };
  const active = path[1]?.id;
  const rootSelected = path.length === 1;
  const activeTier = TIERS.find((t) => t.node.id === active);
  const here = path[path.length - 1];

  const stops = line
    .map((n) => ({ node: n, ...emblemPoint(n.id) }))
    .filter((p, i, all) => i === 0 || p.r !== all[i - 1].r || p.deg !== all[i - 1].deg);
  const tracedTiers = new Set(line.map((n) => pathTo(n.id)[1]?.id));

  return (
    <figure className="flex flex-col items-center">
      <svg
        viewBox="0 0 400 400"
        className="emblem size-68 overflow-visible lg:size-84"
        aria-label="Levels of Church organization"
      >
        <defs>
          {TIERS.map((tier, i) => {
            const r = ringR(i) - 7;
            return (
              <path
                key={tier.node.id}
                id={`emblem-arc-${tier.node.id}`}
                d={`M ${C - r} ${C} A ${r} ${r} 0 0 1 ${C + r} ${C}`}
              />
            );
          })}
        </defs>

        {Array.from({ length: 72 }, (_, i) => (
          <line
            key={i}
            x1={C}
            y1={i % 6 === 0 ? 6 : 10}
            x2={C}
            y2={14}
            transform={`rotate(${i * 5} ${C} ${C})`}
            className="emblem-tick"
          />
        ))}

        {TIERS.map((tier, i) => {
          const r = ringR(i);
          const isActive = active === tier.node.id;
          return (
            <g
              key={tier.node.id}
              role="button"
              tabIndex={0}
              aria-label={tier.node.title}
              aria-pressed={isActive}
              onClick={() => onSelect(tier.node.id)}
              onKeyDown={onKey(tier.node.id)}
              className={cn("emblem-tier", isActive && "is-active", tracedTiers.has(tier.node.id) && "is-traced")}
              style={{ "--i": i } as StaggerStyle}
            >
              <circle cx={C} cy={C} r={r} className="emblem-hit" />
              <circle
                cx={C}
                cy={C}
                r={r}
                pathLength={1}
                transform={`rotate(-90 ${C} ${C})`}
                className="emblem-ring"
              />
              <text className="emblem-label">
                <textPath href={`#emblem-arc-${tier.node.id}`} startOffset="50%" textAnchor="middle">
                  {tier.numeral} · {tier.label}
                </textPath>
              </text>
              {isActive && <RingMarks tierIndex={i} path={path} onSelect={onSelect} onKey={onKey} />}
            </g>
          );
        })}

        {stops.length > 1 && (
          <g key={stops.map((s) => s.node.id).join()} className="emblem-line" aria-hidden>
            <path
              d={tracePath(stops)}
              pathLength={1}
              className="emblem-line-path"
            />
            {stops
              .filter((s) => s.node.id !== ROOT)
              .map((s, i) => (
                <path
                  key={s.node.id}
                  d={diamond(s.x, s.y, 3.5)}
                  className="emblem-line-stop"
                  style={{ "--i": i } as StaggerStyle}
                />
              ))}
          </g>
        )}

        <g
          role="button"
          tabIndex={0}
          aria-label={ORGANIZATION.title}
          aria-pressed={rootSelected}
          onClick={() => onSelect(ROOT)}
          onKeyDown={onKey(ROOT)}
          className="emblem-core"
        >
          <circle cx={C} cy={C} r={46} className="emblem-disc fill-(--color-signal-fill)" />
          <circle cx={C} cy={C} r={41} className="fill-none stroke-primary-foreground/35" strokeWidth={0.6} />
          <text x={C} y={C - 5} textAnchor="middle" className="emblem-core-small">
            Led by
          </text>
          <text x={C} y={C + 12} textAnchor="middle" className="emblem-core-big">
            Jesus Christ
          </text>
        </g>
      </svg>
      <figcaption
        key={`${here.id}|${line.length}`}
        aria-live="polite"
        className="org-fade mt-2 min-h-10 max-w-[18rem] text-center font-serif text-sm"
      >
        {activeTier ? (
          <>
            <span className="eyebrow block text-primary">
              {line.length > 1 ? "Line of authority" : `${activeTier.numeral} · ${activeTier.label}`}
            </span>
            <span className="italic">
              {line.length > 1 ? `${here.title} to Jesus Christ` : here.title}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground italic">Select a ring to explore a level</span>
        )}
      </figcaption>
    </figure>
  );
}

/** A level's callings, set as marks around its ring like stations on an astrolabe. */
function RingMarks({
  tierIndex,
  path,
  onSelect,
  onKey,
}: {
  tierIndex: number;
  path: OrgNode[];
  onSelect: (id: string) => void;
  onKey: (id: string) => (e: React.KeyboardEvent) => void;
}) {
  const marks = TIERS[tierIndex].node.children ?? [];
  const onPath = path[2]?.id;
  return (
    <g>
      {marks.map((m, k) => {
        const { x, y } = stationPoint(tierIndex, k, marks.length);
        const lit = onPath === m.id;
        return (
          <g
            key={m.id}
            role="button"
            tabIndex={0}
            aria-label={m.title}
            aria-pressed={lit}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(m.id);
            }}
            onKeyDown={onKey(m.id)}
            className={cn("emblem-mark", lit && "is-lit")}
            style={{ "--i": k } as StaggerStyle}
          >
            <title>{m.title}</title>
            <circle cx={x} cy={y} r={9} className="emblem-mark-hit" />
            <path d={diamond(x, y, 5)} className="emblem-mark-gem" />
          </g>
        );
      })}
    </g>
  );
}

function FindCalling({ onPick }: { onPick: (id: string) => void }) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const results = React.useMemo(() => searchCallings(query), [query]);
  const listId = React.useId();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== "/" || t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pick = (node: OrgNode) => {
    onPick(node.id);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!results.length) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => (a + step + results.length) % results.length);
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      pick(results[active]);
    } else if (e.key === "Escape") {
      setQuery("");
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showList = open && query.trim().length > 0;

  return (
    <div className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute top-1/2 left-0 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && results[active] ? `${listId}-${results[active].id}` : undefined}
        aria-label="Find a calling"
        placeholder="Find a calling"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="h-9 w-full border-0 border-b border-field-edge bg-transparent pr-7 pl-6 font-serif text-[0.95rem] outline-none placeholder:text-muted-foreground placeholder:italic"
      />
      {query && (
        <button
          type="button"
          aria-label="Clear search"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setQuery("")}
          className="absolute top-1/2 right-0 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}

      {showList && (
        <div
          id={listId}
          role="listbox"
          className="org-pop absolute top-full z-30 mt-2 w-full min-w-[18rem] rounded-lg border border-border bg-popover py-1 shadow-md"
        >
          {results.length === 0 ? (
            <p className="px-3 py-3 font-serif text-sm text-muted-foreground italic">
              Nothing matches &ldquo;{query.trim()}&rdquo;
            </p>
          ) : (
            results.map((node, i) => {
              const tier = tierOf(node.id);
              return (
                <div
                  key={node.id}
                  id={`${listId}-${node.id}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(node)}
                  className={cn(
                    "flex cursor-pointer items-baseline gap-3 px-3 py-2",
                    i === active && "bg-accent",
                  )}
                >
                  <span className="w-5 shrink-0 font-serif text-xs text-primary tabular-nums">
                    {tier?.numeral}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-[0.95rem] leading-tight">
                      <Highlight text={node.title} query={query} />
                    </span>
                    <span className="block truncate font-serif text-xs text-muted-foreground">
                      {node.tagline}
                    </span>
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  const at = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span className="underline decoration-primary decoration-1 underline-offset-2">
        {text.slice(at, at + q.length)}
      </span>
      {text.slice(at + q.length)}
    </>
  );
}

function CompareBar({
  pinned,
  current,
  onClear,
}: {
  pinned: OrgNode;
  current: OrgNode;
  onClear: () => void;
}) {
  const waiting = pinned.id === current.id || current.id === ROOT;
  return (
    <div className="org-fade mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-serif text-sm">
      <span className="flex items-baseline gap-2">
        <span aria-hidden className="size-1.5 shrink-0 translate-y-[-0.1rem] rotate-45 bg-primary" />
        {waiting ? (
          <span className="text-muted-foreground italic">
            Comparing <span className="text-foreground not-italic">{pinned.title}</span>. Select
            another calling to set beside it.
          </span>
        ) : (
          <span className="text-muted-foreground">
            <span className="text-foreground">{pinned.title}</span> <em>beside</em>{" "}
            <span className="text-foreground">{current.title}</span>
          </span>
        )}
      </span>
      {!waiting && (
        <a
          href="#compare"
          className="text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
        >
          View comparison
        </a>
      )}
      <button type="button" onClick={onClear} className="text-muted-foreground transition-colors hover:text-primary">
        {waiting ? "Cancel" : "Stop comparing"}
      </button>
    </div>
  );
}

function Branch({
  node,
  depth,
  index,
  state,
}: {
  node: OrgNode;
  depth: number;
  index: number;
  state: MapState;
}) {
  const children = node.children ?? [];
  const isOpen = children.length > 0 && state.expanded.has(node.id);
  const isSelected = state.selected === node.id;
  const isOnPath = state.onPath.has(node.id);
  const isInLine = state.inLine.has(node.id) && !isSelected && depth > 0;
  const numeral = depth === 1 ? TIERS.find((t) => t.node.id === node.id)?.numeral : undefined;
  const { select } = state.actions;

  const onKeyDown = (e: React.KeyboardEvent) => {
    const siblings = siblingsOf(node.id);
    const at = siblings.findIndex((s) => s.id === node.id);
    const go = (id?: string) => {
      if (!id) return;
      e.preventDefault();
      select(id, true);
    };
    switch (e.key) {
      case "ArrowRight":
        if (!children.length) return;
        if (isOpen) go(children[0].id);
        else {
          e.preventDefault();
          state.toggle(node.id);
        }
        break;
      case "ArrowLeft":
        if (isOpen) {
          e.preventDefault();
          state.toggle(node.id);
        } else go(parentOf.get(node.id));
        break;
      case "ArrowDown":
        go(siblings[at + 1]?.id);
        break;
      case "ArrowUp":
        go(siblings[at - 1]?.id);
        break;
    }
  };

  return (
    <li className={cn(isOnPath && "mm-on")} style={{ "--i": index } as StaggerStyle}>
      <div className="mm-row">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-node-id={node.id}
            onClick={() => select(node.id)}
            onKeyDown={onKeyDown}
            aria-current={isSelected ? "true" : undefined}
            className={cn(
              "mm-node rounded-lg border px-3.5 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              isInLine ? "outline-1 outline-offset-3 outline-primary/60 outline-dashed" : "outline-none",
              depth === 0
                ? "border-(--color-signal-fill) bg-(--color-signal-fill) text-primary-foreground hover:bg-(--color-signal-fill)/90"
                : isSelected
                  ? "border-primary bg-card ring-1 ring-primary"
                  : isOnPath || isInLine
                    ? "border-primary/50 bg-card hover:border-primary"
                    : "border-border bg-card hover:border-foreground/30",
            )}
          >
            {numeral && (
              <span className="mb-0.5 block font-serif text-xs text-primary">
                {numeral}
              </span>
            )}
            <span
              className={cn(
                "block font-display leading-tight tracking-tight",
                depth <= 1 ? "text-[1.05rem] font-medium" : "text-[0.95rem]",
              )}
            >
              {node.title}
            </span>
            <span
              className={cn(
                "mt-0.5 block font-serif text-[0.8rem] leading-snug",
                depth === 0 ? "text-primary-foreground/80" : "text-muted-foreground",
              )}
            >
              {node.tagline}
            </span>
          </button>

          {children.length > 0 && (
            <button
              type="button"
              onClick={() => state.toggle(node.id)}
              aria-expanded={isOpen}
              aria-label={`${isOpen ? "Collapse" : "Expand"} ${node.title}`}
              className="flex h-6 min-w-6 shrink-0 items-center justify-center gap-0.5 rounded-full border border-border bg-background px-1.5 text-[0.7rem] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {isOpen ? (
                <Minus className="size-3" />
              ) : (
                <>
                  <Plus className="size-3" />
                  {children.length}
                </>
              )}
            </button>
          )}
        </div>

        {isSelected && (
          <div className="org-pop mt-3 mb-1 w-full max-w-md rounded-lg border border-border bg-background p-4 lg:hidden">
            <NodeDetail node={node} path={pathTo(node.id)} actions={state.actions} compact />
          </div>
        )}

        {isOpen && (
          <ul className={cn("mm-children", children.some((c) => state.onPath.has(c.id)) && "mm-children-on")}>
            {children.map((child, i) => (
              <Branch key={child.id} node={child} depth={depth + 1} index={i} state={state} />
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

function NodeDetail({
  node,
  path,
  actions,
  compact = false,
}: {
  node: OrgNode;
  path: OrgNode[];
  actions: Actions;
  compact?: boolean;
}) {
  const { select, view } = actions;
  const tier = tierOf(node.id);
  const siblings = siblingsOf(node.id);
  const at = siblings.findIndex((s) => s.id === node.id);
  let n = 0;
  const step = () => ({ "--i": n++ }) as StaggerStyle;

  return (
    <div key={node.id}>
      {!compact && (
        <>
          <nav
            aria-label="Position in the Church"
            className="org-fade mb-4 flex min-h-4 flex-wrap items-center gap-1 font-serif text-xs text-muted-foreground"
          >
            {path.slice(0, -1).map((p) => (
              <React.Fragment key={p.id}>
                <button type="button" onClick={() => select(p.id)} className="transition-colors hover:text-primary">
                  {p.id === ROOT ? "Church" : p.title}
                </button>
                <ChevronRight className="size-3 opacity-60" />
              </React.Fragment>
            ))}
          </nav>

          <h2 className="org-stagger font-display text-2xl leading-tight tracking-tight text-balance" style={step()}>
            {node.title}
          </h2>
          <p className="org-stagger mt-1 eyebrow text-primary" style={step()}>
            {tier ? `${tier.numeral}. ${tier.label}` : "The whole Church"}
          </p>
          <p className="org-stagger mt-1 font-serif text-sm text-muted-foreground italic" style={step()}>
            {node.tagline}
          </p>
        </>
      )}

      <p
        className={cn("org-stagger font-serif text-[0.95rem] leading-relaxed text-pretty", !compact && "mt-4")}
        style={step()}
      >
        {node.summary}
      </p>

      {node.duties && (
        <div className="org-stagger mt-5" style={step()}>
          <p className="eyebrow text-muted-foreground">Responsibilities</p>
          <Duties duties={node.duties} />
        </div>
      )}

      {node.calledBy && (
        <div className="org-stagger mt-5" style={step()}>
          <p className="eyebrow text-muted-foreground">Called by</p>
          <p className="mt-1 font-serif text-[0.9rem]">{node.calledBy}</p>
        </div>
      )}

      <LineOfAuthority node={node} actions={actions} className="org-stagger mt-5" style={step()} />

      {node.scriptures && (
        <div className="org-stagger mt-5" style={step()}>
          <p className="eyebrow text-muted-foreground">Scriptures</p>
          <Scriptures refs={node.scriptures} />
        </div>
      )}

      {!compact && node.children && (
        <div className="org-stagger mt-5" style={step()}>
          <p className="eyebrow text-muted-foreground">Includes</p>
          <ul className="mt-2 font-serif text-[0.9rem]">
            {node.children.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => select(c.id)}
                  className="py-0.5 text-left underline decoration-border underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
                >
                  {c.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {node.section && (
        <p className="mt-6 border-t border-border pt-3 font-serif text-xs text-muted-foreground italic">
          General Handbook · {node.section}
        </p>
      )}

      {!compact && siblings.length > 1 && (
        <div className="mt-3 flex justify-between gap-4 font-serif text-xs text-muted-foreground">
          {siblings[at - 1] ? (
            <button
              type="button"
              onClick={() => select(siblings[at - 1].id)}
              className="flex min-w-0 items-center gap-1 transition-colors hover:text-primary"
            >
              <ArrowLeft className="size-3 shrink-0" />
              <span className="truncate">{siblings[at - 1].title}</span>
            </button>
          ) : (
            <span />
          )}
          {siblings[at + 1] && (
            <button
              type="button"
              onClick={() => select(siblings[at + 1].id)}
              className="flex min-w-0 items-center gap-1 text-right transition-colors hover:text-primary"
            >
              <span className="truncate">{siblings[at + 1].title}</span>
              <ArrowRight className="size-3 shrink-0" />
            </button>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 font-serif text-xs text-muted-foreground">
        {node.id !== ROOT && (
          <button
            type="button"
            onClick={() => actions.compareWith(view.vs === node.id ? null : node.id)}
            className="transition-colors hover:text-primary"
          >
            {view.vs === node.id ? "Stop comparing" : view.vs ? "Compare with this instead" : "Compare with…"}
          </button>
        )}
        <CopyLink />
      </div>
    </div>
  );
}

function Duties({ duties, shared }: { duties: string[]; shared?: Set<string> }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {duties.map((d) => {
        const both = shared?.has(d);
        return (
          <li key={d} className="flex gap-2.5 font-serif text-[0.9rem] leading-snug">
            <span
              aria-hidden
              className={cn(
                "mt-[0.45rem] size-1.5 shrink-0 rotate-45",
                both ? "bg-primary" : shared ? "border border-primary/60" : "bg-primary/60",
              )}
            />
            <span>
              {d}
              {both && <span className="eyebrow ml-2 text-[0.65rem] text-primary">Shared</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Scriptures({ refs }: { refs: string[] }) {
  return (
    <p className="mt-1 font-serif text-[0.9rem]">
      {refs.map((ref, i) => (
        <React.Fragment key={ref}>
          {i > 0 && (
            <span aria-hidden className="mx-2 text-muted-foreground">
              ·
            </span>
          )}
          <Link
            href={scriptureHref(ref)}
            className="underline decoration-border underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
          >
            {ref}
          </Link>
        </React.Fragment>
      ))}
    </p>
  );
}

/** Authority flows down from Christ: the chain is drawn top to bottom, ending at this calling. */
function LineOfAuthority({
  node,
  actions,
  className,
  style,
}: {
  node: OrgNode;
  actions: Actions;
  className?: string;
  style?: React.CSSProperties;
}) {
  const line = lineOf(node.id);
  if (line.length < 2) return null;
  const tracing = actions.view.line && actions.view.c === node.id;
  return (
    <div className={className} style={style}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="eyebrow text-muted-foreground">Line of authority</p>
        <button
          type="button"
          aria-pressed={tracing}
          onClick={() => actions.setLine(!tracing)}
          className={cn(
            "font-serif text-xs transition-colors hover:text-primary",
            tracing ? "text-primary" : "text-muted-foreground",
          )}
        >
          {tracing ? "Hide on map" : "Trace on map"}
        </button>
      </div>
      <ol className="org-line mt-2 font-serif text-[0.9rem]">
        {line.map((step, i) => (
          <li key={step.id} style={{ "--i": i } as StaggerStyle}>
            {step.id === node.id ? (
              <span className="text-muted-foreground italic">{nameOf(step)}</span>
            ) : (
              <button
                type="button"
                onClick={() => actions.select(step.id)}
                className="text-left transition-colors hover:text-primary"
              >
                {nameOf(step)}
              </button>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function CopyLink() {
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(window.location.href).then(() => setCopied(true))}
      className="transition-colors hover:text-primary"
    >
      <span aria-live="polite">{copied ? "Link copied" : "Copy link"}</span>
    </button>
  );
}

/** Two callings side by side, with the point where their lines of authority meet. */
function Comparison({
  a,
  b,
  onSelect,
  onSwap,
  onClose,
}: {
  a: OrgNode;
  b: OrgNode;
  onSelect: (id: string) => void;
  onSwap: () => void;
  onClose: () => void;
}) {
  const lineA = lineOf(a.id);
  const lineB = lineOf(b.id);
  const meet = [...lineA].reverse().find((n) => lineB.some((m) => m.id === n.id));
  const shared = new Set((a.duties ?? []).filter((d) => b.duties?.includes(d)));

  let relation = "";
  if (meet?.id === a.id) relation = `${b.title} serves under ${a.title}.`;
  else if (meet?.id === b.id) relation = `${a.title} serves under ${b.title}.`;
  else if (meet?.id === ROOT) relation = "Their lines of authority meet in Jesus Christ.";
  else if (meet) relation = `Their lines of authority meet at the ${meet.title}.`;

  return (
    <section id="compare" aria-labelledby="compare-title" className="org-fade mt-16 scroll-mt-24 border-t border-border pt-10">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="max-w-3xl">
          <h2 id="compare-title" className="font-display text-3xl font-light tracking-tight text-balance sm:text-4xl">
            {a.title} and {b.title}
          </h2>
          {(relation || shared.size > 0) && (
            <p className="mt-3 font-serif text-[0.95rem] text-muted-foreground italic">
              {relation}
              {shared.size > 0 &&
                ` They share ${shared.size} responsibilit${shared.size === 1 ? "y" : "ies"}.`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4 font-serif text-sm text-muted-foreground">
          <button type="button" onClick={onSwap} className="transition-colors hover:text-primary">
            Swap
          </button>
          <span aria-hidden className="size-1 rotate-45 bg-border" />
          <button type="button" onClick={onClose} className="transition-colors hover:text-primary">
            Close
          </button>
        </div>
      </div>

      <div className="mt-10 grid gap-12 md:grid-cols-2 md:gap-0 md:divide-x md:divide-border">
        {[a, b].map((node, i) => (
          <CompareColumn
            key={node.id}
            node={node}
            shared={shared}
            onSelect={onSelect}
            className={i === 0 ? "md:pr-10" : "md:pl-10"}
          />
        ))}
      </div>
    </section>
  );
}

function CompareColumn({
  node,
  shared,
  onSelect,
  className,
}: {
  node: OrgNode;
  shared: Set<string>;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const tier = tierOf(node.id);
  const under = node.under ? byId.get(node.under) : undefined;
  let n = 0;
  const step = () => ({ "--i": n++ }) as StaggerStyle;
  return (
    <article className={className}>
      <h3 className="org-stagger font-display text-2xl leading-tight tracking-tight" style={step()}>
        {node.title}
      </h3>
      <p className="org-stagger mt-1 eyebrow text-primary" style={step()}>
        {tier ? `${tier.numeral}. ${tier.label}` : "The whole Church"}
      </p>
      <p className="org-stagger mt-1 font-serif text-sm text-muted-foreground italic" style={step()}>
        {node.tagline}
      </p>
      <p className="org-stagger mt-4 font-serif text-[0.95rem] leading-relaxed text-pretty" style={step()}>
        {node.summary}
      </p>

      <dl className="org-stagger mt-6 space-y-5" style={step()}>
        {node.duties && (
          <div>
            <dt className="eyebrow text-muted-foreground">Responsibilities</dt>
            <dd>
              <Duties duties={node.duties} shared={shared} />
            </dd>
          </div>
        )}
        {node.calledBy && (
          <div>
            <dt className="eyebrow text-muted-foreground">Called by</dt>
            <dd className="mt-1 font-serif text-[0.9rem]">{node.calledBy}</dd>
          </div>
        )}
        {under && (
          <div>
            <dt className="eyebrow text-muted-foreground">Serves under</dt>
            <dd className="mt-1 font-serif text-[0.9rem]">
              <button
                type="button"
                onClick={() => onSelect(under.id)}
                className="text-left underline decoration-border underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
              >
                {nameOf(under)}
              </button>
            </dd>
          </div>
        )}
        {node.scriptures && (
          <div>
            <dt className="eyebrow text-muted-foreground">Scriptures</dt>
            <dd>
              <Scriptures refs={node.scriptures} />
            </dd>
          </div>
        )}
      </dl>

      {node.section && (
        <p className="mt-6 border-t border-border pt-3 font-serif text-xs text-muted-foreground italic">
          General Handbook · {node.section}
        </p>
      )}
    </article>
  );
}
