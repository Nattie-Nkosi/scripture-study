"use client";

import Link from "next/link";
import { Menu } from "@base-ui/react/menu";
import { Bookmark, Library, Menu as MenuIcon, Mic, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

const ITEMS = [
  { href: "/read", label: "Library", icon: Library },
  { href: "/talks", label: "Conference", icon: Mic },
  { href: "/study", label: "My study", icon: Bookmark },
  { href: "/search", label: "Search", icon: Search },
];

/** Primary navigation for small screens, where the header's inline links are
 *  hidden. A hamburger that opens the same destinations in a dropdown. */
export function MobileNav() {
  return (
    <Menu.Root>
      <Menu.Trigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Open menu"
            className="sm:hidden"
          />
        }
      >
        <MenuIcon />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="end" className="z-50">
          <Menu.Popup className="min-w-48 origin-[var(--transform-origin)] rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg shadow-black/5 outline-none transition-[transform,opacity] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            {ITEMS.map(({ href, label, icon: Icon }) => (
              <Menu.LinkItem
                key={href}
                closeOnClick
                render={<Link href={href} />}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm outline-none select-none data-[highlighted]:bg-muted data-[highlighted]:text-foreground"
              >
                <Icon className="size-4 text-muted-foreground" />
                {label}
              </Menu.LinkItem>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
