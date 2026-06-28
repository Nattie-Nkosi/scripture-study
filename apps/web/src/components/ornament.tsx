import { cn } from "@/lib/utils";

/** A small editorial divider: hairline — diamond — hairline, in the garnet accent. */
export function Ornament({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("flex items-center justify-center gap-3", className)}
    >
      <span className="h-px w-10 bg-border sm:w-14" />
      <span className="size-1.5 rotate-45 bg-primary/45" />
      <span className="h-px w-10 bg-border sm:w-14" />
    </div>
  );
}
