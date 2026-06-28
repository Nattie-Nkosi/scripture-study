import { cn } from "@/lib/utils";

/** The Scripture Study mark: an open book beneath a spark of light, in the
 *  garnet accent (via `currentColor`). Decorative by default — pair it with the
 *  wordmark for the accessible name. The same geometry backs `app/icon.svg` and
 *  `app/apple-icon.tsx`; keep them in sync if the paths change. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("size-5", className)}
    >
      <path d="M12 3.4 13.7 5.1 12 6.8 10.3 5.1Z" fill="currentColor" />
      <g
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 9.2C9.2 8 6.5 7.7 4.1 7.9 3.75 7.93 3.5 8.22 3.5 8.57V17.5c0 .35.26.64.61.61C6.5 17.9 9.2 18.2 12 19.4" />
        <path d="M12 9.2c2.8-1.2 5.5-1.5 7.9-1.3.35.03.6.32.6.67V17.5c0 .35-.26.64-.61.61C17.5 17.9 14.8 18.2 12 19.4" />
        <path d="M12 9.2V19.4" />
      </g>
    </svg>
  );
}
