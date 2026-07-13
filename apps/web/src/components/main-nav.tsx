"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/read", label: "Library" },
  { href: "/talks", label: "Conference" },
  { href: "/come-follow-me", label: "Come, Follow Me" },
  { href: "/study-helps", label: "Study Helps" },
  { href: "/ask", label: "Ask" },
  { href: "/study", label: "My study" },
];

/** A link is current when it points at the page or one of its descendants, so
 *  deeper routes (e.g. /talks/2024-04) still highlight their section. The `/`
 *  boundary keeps "/study" from also matching "/study-helps". */
function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The primary inline navigation, shown beside the wordmark on large screens
 *  (smaller screens use the command palette and the hamburger menu). A garnet
 *  hairline grows under the current section — and under any link on hover — in
 *  place of a pill background, for a quieter, more editorial feel. */
export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-5 lg:flex">
      {LINKS.map(({ href, label }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative py-1 text-sm whitespace-nowrap transition-colors",
              "after:absolute after:inset-x-0 after:-bottom-px after:h-px after:origin-left after:scale-x-0 after:bg-primary after:transition-transform after:duration-200 hover:after:scale-x-100",
              active
                ? "text-foreground after:scale-x-100"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
