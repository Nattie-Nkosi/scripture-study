"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, ChevronRight, Minus, Plus, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { ORGANIZATION, type OrgNode } from "@/lib/organization/data";

const byId = new Map<string, OrgNode>();
const parentOf = new Map<string, string>();
(function index(node: OrgNode) {
  byId.set(node.id, node);
  for (const child of node.children ?? []) {
    parentOf.set(child.id, node.id);
    index(child);
  }
})(ORGANIZATION);

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

const SEARCH_INDEX = [...byId.values()]
  .filter((n) => n.id !== ORGANIZATION.id)
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

type MapState = {
  expanded: Set<string>;
  selected: string;
  onPath: Set<string>;
  select: (id: string, focus?: boolean) => void;
  toggle: (id: string) => void;
};

type StaggerStyle = React.CSSProperties & { "--i"?: number };

export function OrgMindMap() {
  const [expanded, setExpanded] = React.useState(() => new Set([ORGANIZATION.id]));
  const [selected, setSelected] = React.useState(ORGANIZATION.id);

  const path = React.useMemo(() => pathTo(selected), [selected]);
  const onPath = React.useMemo(() => new Set(path.map((n) => n.id)), [path]);

  const select = React.useCallback((id: string, focus = false) => {
    setSelected(id);
    // Selecting focuses the map on that path, closing unrelated branches so it stays compact.
    setExpanded(new Set(pathTo(id).filter((n) => n.children?.length).map((n) => n.id)));
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-node-id="${id}"]`);
      if (!el) return;
      el.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
      if (focus) el.focus({ preventScroll: true });
    });
  }, []);

  const toggle = React.useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const state: MapState = { expanded, selected, onPath, select, toggle };
  const current = byId.get(selected)!;
  const activeTier = path[1]?.id;

  return (
    <div>
      <section className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="max-w-2xl">
          <p className="org-rise eyebrow text-primary">Church Organization</p>
          <h1
            className="org-rise mt-3 font-display text-5xl font-light tracking-tight sm:text-6xl"
            style={{ "--i": 1 } as StaggerStyle}
          >
            Who serves <em>where</em>
          </h1>
          <p
            className="org-rise mt-4 font-serif text-lg leading-relaxed text-muted-foreground text-pretty"
            style={{ "--i": 2 } as StaggerStyle}
          >
            A map of the Church&apos;s leaders and members — from the First Presidency to your
            ward and home. Select any calling to see what it does, who calls it, and where the
            General Handbook explains it.
          </p>
          <p
            className="org-rise eyebrow mt-6 text-muted-foreground"
            style={{ "--i": 3 } as StaggerStyle}
          >
            {TIERS.length} levels · {CALLING_COUNT} callings &amp; roles · {SECTION_COUNT} handbook
            sections
          </p>
        </div>

        <div className="hidden justify-center sm:flex">
          <Emblem path={path} onSelect={select} />
        </div>
      </section>

      <div className="mt-16 grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-end gap-x-8 gap-y-4 border-b border-border pb-4">
            <FindCalling onPick={(id) => select(id, true)} />

            <nav aria-label="Levels" className="flex flex-wrap gap-x-5 gap-y-1">
              {TIERS.map((tier) => (
                <button
                  key={tier.node.id}
                  type="button"
                  onClick={() => select(tier.node.id)}
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
                onClick={() => setExpanded(new Set(ALL_BRANCHES))}
                className="transition-colors hover:text-primary"
              >
                Expand all
              </button>
              <span aria-hidden className="size-1 rotate-45 bg-border" />
              <button
                type="button"
                onClick={() => {
                  setExpanded(new Set([ORGANIZATION.id]));
                  setSelected(ORGANIZATION.id);
                }}
                className="transition-colors hover:text-primary"
              >
                Collapse
              </button>
            </div>
          </div>

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
            <NodeDetail node={current} path={path} onSelect={select} />
          </div>
        </aside>
      </div>
    </div>
  );
}

const C = 200;

/** Concentric rings, read from the center out: Christ, then each level of the Church. */
function Emblem({
  path,
  onSelect,
}: {
  path: OrgNode[];
  onSelect: (id: string) => void;
}) {
  const ringR = (i: number) => 70 + i * 28;
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

  return (
    <figure className="flex flex-col items-center">
      <svg
        viewBox="0 0 400 400"
        className="emblem size-[17rem] overflow-visible lg:size-[21rem]"
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
              className={cn("emblem-tier", isActive && "is-active")}
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
              {isActive && <RingMarks tier={tier} r={r} path={path} onSelect={onSelect} onKey={onKey} />}
            </g>
          );
        })}

        <g
          role="button"
          tabIndex={0}
          aria-label={ORGANIZATION.title}
          aria-pressed={rootSelected}
          onClick={() => onSelect(ORGANIZATION.id)}
          onKeyDown={onKey(ORGANIZATION.id)}
          className="emblem-core"
        >
          <circle cx={C} cy={C} r={46} className="emblem-disc fill-primary" />
          <circle cx={C} cy={C} r={41} className="fill-none stroke-primary-foreground/35" strokeWidth={0.6} />
          <text x={C} y={C - 5} textAnchor="middle" className="emblem-core-small">
            LED BY
          </text>
          <text x={C} y={C + 12} textAnchor="middle" className="emblem-core-big">
            Jesus Christ
          </text>
        </g>
      </svg>
      <figcaption
        key={here.id}
        aria-live="polite"
        className="org-fade mt-2 min-h-10 max-w-[18rem] text-center font-serif text-sm"
      >
        {activeTier ? (
          <>
            <span className="eyebrow block text-primary">
              {activeTier.numeral} · {activeTier.label}
            </span>
            <span className="italic">{here.title}</span>
          </>
        ) : (
          <span className="text-muted-foreground italic">Select a ring to explore a level</span>
        )}
      </figcaption>
    </figure>
  );
}

/** A level's callings, set as marks around its ring like stations on an astrolabe.
 *  They fan out clockwise from below the ring's label, leaving the top arc clear. */
function RingMarks({
  tier,
  r,
  path,
  onSelect,
  onKey,
}: {
  tier: Tier;
  r: number;
  path: OrgNode[];
  onSelect: (id: string) => void;
  onKey: (id: string) => (e: React.KeyboardEvent) => void;
}) {
  const marks = tier.node.children ?? [];
  const onPath = path[2]?.id;
  const spread = 280;
  const start = -90 + (360 - spread) / 2;
  return (
    <g>
      {marks.map((m, k) => {
        const deg = start + (marks.length > 1 ? (k * spread) / (marks.length - 1) : spread / 2);
        const rad = (deg * Math.PI) / 180;
        const x = C + r * Math.cos(rad);
        const y = C + r * Math.sin(rad);
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
            <path
              d={`M ${x} ${y - 5} L ${x + 5} ${y} L ${x} ${y + 5} L ${x - 5} ${y} Z`}
              className="emblem-mark-gem"
            />
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
        className="h-9 w-full border-0 bg-transparent pr-7 pl-6 font-serif text-[0.95rem] outline-none placeholder:text-muted-foreground placeholder:italic"
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
  const numeral = depth === 1 ? TIERS.find((t) => t.node.id === node.id)?.numeral : undefined;

  const onKeyDown = (e: React.KeyboardEvent) => {
    const siblings = siblingsOf(node.id);
    const at = siblings.findIndex((s) => s.id === node.id);
    const go = (id?: string) => {
      if (!id) return;
      e.preventDefault();
      state.select(id, true);
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
            onClick={() => state.select(node.id)}
            onKeyDown={onKeyDown}
            aria-current={isSelected ? "true" : undefined}
            className={cn(
              "mm-node rounded-lg border px-3.5 py-2.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              depth === 0
                ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                : isSelected
                  ? "border-primary bg-card ring-1 ring-primary"
                  : isOnPath
                    ? "border-primary/50 bg-card hover:border-primary"
                    : "border-border bg-card hover:border-foreground/30",
            )}
          >
            {numeral && (
              <span className="mb-0.5 block font-serif text-[0.7rem] tracking-[0.15em] text-primary">
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
            <NodeDetail node={node} path={pathTo(node.id)} onSelect={state.select} compact />
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
  onSelect,
  compact = false,
}: {
  node: OrgNode;
  path: OrgNode[];
  onSelect: (id: string, focus?: boolean) => void;
  compact?: boolean;
}) {
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
                <button type="button" onClick={() => onSelect(p.id)} className="transition-colors hover:text-primary">
                  {p.id === ORGANIZATION.id ? "Church" : p.title}
                </button>
                <ChevronRight className="size-3 opacity-60" />
              </React.Fragment>
            ))}
          </nav>

          <p className="org-stagger eyebrow text-primary" style={step()}>
            {tier ? `${tier.numeral} · ${tier.label}` : "The whole Church"}
          </p>
          <h2 className="org-stagger mt-1 font-display text-2xl leading-tight tracking-tight text-balance" style={step()}>
            {node.title}
          </h2>
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
          <ul className="mt-2 space-y-1.5">
            {node.duties.map((d) => (
              <li key={d} className="flex gap-2.5 font-serif text-[0.9rem] leading-snug">
                <span aria-hidden className="mt-[0.45rem] size-1.5 shrink-0 rotate-45 bg-primary/60" />
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      {node.calledBy && (
        <div className="org-stagger mt-5" style={step()}>
          <p className="eyebrow text-muted-foreground">Called by</p>
          <p className="mt-1 font-serif text-[0.9rem]">{node.calledBy}</p>
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
                  onClick={() => onSelect(c.id)}
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
              onClick={() => onSelect(siblings[at - 1].id)}
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
              onClick={() => onSelect(siblings[at + 1].id)}
              className="flex min-w-0 items-center gap-1 text-right transition-colors hover:text-primary"
            >
              <span className="truncate">{siblings[at + 1].title}</span>
              <ArrowRight className="size-3 shrink-0" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
