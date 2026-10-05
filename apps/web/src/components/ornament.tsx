import { cn } from "@/lib/utils";

/** A small editorial divider: hairline — diamond — hairline, in the garnet accent. */
export function Ornament({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("flex items-center justify-center gap-3", className)}
    >
      <span className="h-px w-12 bg-gradient-to-r from-transparent to-border sm:w-20" />
      <span className="size-1.5 rotate-45 bg-primary/50" />
      <span className="h-px w-12 bg-gradient-to-l from-transparent to-border sm:w-20" />
    </div>
  );
}
