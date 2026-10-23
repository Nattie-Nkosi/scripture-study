"use client";

import * as React from "react";
import { ChevronRight, Minus, Plus } from "lucide-react";

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

function pathTo(id: string): OrgNode[] {
  const path: OrgNode[] = [];
  for (let cur: string | undefined = id; cur; cur = parentOf.get(cur)) {
    path.unshift(byId.get(cur)!);
  }
  return path;
}

type MapState = {
  expanded: Set<string>;
  selected: string;
  onPath: Set<string>;
  select: (id: string) => void;
  toggle: (id: string) => void;
};

export function OrgMindMap() {
  const [expanded, setExpanded] = React.useState(() => new Set([ORGANIZATION.id]));
  const [selected, setSelected] = React.useState(ORGANIZATION.id);

  const path = React.useMemo(() => pathTo(selected), [selected]);
  const onPath = React.useMemo(() => new Set(path.map((n) => n.id)), [path]);

  const select = React.useCallback((id: string) => {
    setSelected(id);
    // Selecting focuses the map on that path, closing unrelated branches so it stays compact.
    setExpanded(new Set(pathTo(id).filter((n) => n.children?.length).map((n) => n.id)));
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

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0">
        <div className="mb-4 flex items-center gap-4 font-serif text-sm text-muted-foreground">
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

        <div className="overflow-x-auto rounded-xl border border-border bg-card/40 p-4 sm:p-6">
          <ul className="mindmap">
            <Branch node={ORGANIZATION} depth={0} state={state} />
          </ul>
        </div>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-24">
          <NodeDetail node={current} path={path} onSelect={select} />
        </div>
      </aside>
    </div>
  );
}

function Branch({ node, depth, state }: { node: OrgNode; depth: number; state: MapState }) {
  const children = node.children ?? [];
  const isOpen = children.length > 0 && state.expanded.has(node.id);
  const isSelected = state.selected === node.id;

  return (
    <li>
      <div className="mm-row">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => state.select(node.id)}
            aria-current={isSelected ? "true" : undefined}
            className={cn(
              "mm-node rounded-lg border px-3.5 py-2.5 text-left transition-colors",
              depth === 0
                ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                : isSelected
                  ? "border-primary bg-primary/8 ring-1 ring-primary"
                  : state.onPath.has(node.id)
                    ? "border-primary/50 bg-card hover:border-primary"
                    : "border-border bg-card hover:border-primary/60",
            )}
          >
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
          <div className="mt-3 mb-1 w-full max-w-md rounded-lg border border-border bg-background p-4 lg:hidden">
            <NodeDetail node={node} path={pathTo(node.id)} onSelect={state.select} compact />
          </div>
        )}

        {isOpen && (
          <ul className="mm-children animate-in fade-in duration-200 motion-reduce:animate-none">
            {children.map((child) => (
              <Branch key={child.id} node={child} depth={depth + 1} state={state} />
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
  onSelect: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <div>
      {!compact && path.length > 1 && (
        <nav aria-label="Position in the Church" className="mb-3 flex flex-wrap items-center gap-1 font-serif text-xs text-muted-foreground">
          {path.slice(0, -1).map((p) => (
            <React.Fragment key={p.id}>
              <button type="button" onClick={() => onSelect(p.id)} className="transition-colors hover:text-primary">
                {p.title}
              </button>
              <ChevronRight className="size-3 opacity-60" />
            </React.Fragment>
          ))}
        </nav>
      )}

      {!compact && (
        <>
          <h2 className="font-display text-2xl leading-tight tracking-tight">{node.title}</h2>
          <p className="mt-1 font-serif text-sm text-primary italic">{node.tagline}</p>
        </>
      )}

      <p className={cn("font-serif leading-relaxed text-pretty", compact ? "text-[0.95rem]" : "mt-4 text-[0.95rem]")}>
        {node.summary}
      </p>

      {node.duties && (
        <div className="mt-5">
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
        <div className="mt-5">
          <p className="eyebrow text-muted-foreground">Called by</p>
          <p className="mt-1 font-serif text-[0.9rem]">{node.calledBy}</p>
        </div>
      )}

      {!compact && node.children && (
        <div className="mt-5">
          <p className="eyebrow text-muted-foreground">Includes</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {node.children.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.id)}
                className="rounded-full border border-border px-2.5 py-1 font-serif text-xs transition-colors hover:border-primary hover:text-primary"
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {node.section && (
        <p className="mt-6 border-t border-border pt-3 font-serif text-xs text-muted-foreground italic">
          General Handbook · {node.section}
        </p>
      )}
    </div>
  );
}
