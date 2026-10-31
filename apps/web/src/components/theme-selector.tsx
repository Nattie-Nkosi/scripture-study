"use client";

import * as React from "react";
import { Menu } from "@base-ui/react/menu";
import { Check, Palette } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ThemeOption = {
  value: string;
  label: string;
  hint: string;
};

const THEMES: ThemeOption[] = [
  { value: "light", label: "Paper", hint: "Bright cream" },
  { value: "sepia", label: "Sepia", hint: "Warm aged paper" },
  { value: "dark", label: "Dark", hint: "Warm charcoal" },
  { value: "night", label: "Night", hint: "True black for OLED" },
  { value: "twilight", label: "Twilight", hint: "Indigo and gold" },
];

/** A tiny page set in a theme's own palette. The theme class on the wrapper
 *  re-scopes the palette variables, so the preview always shows that theme
 *  whatever the page around it is using. */
function PagePreview({ theme, className }: { theme: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        theme,
        "flex h-full flex-col justify-center bg-background px-1.5 text-foreground",
        className,
      )}
    >
      <span className="font-display text-[0.9375rem] leading-none">Aa</span>
      <span className="mt-1 h-px w-4 bg-primary" />
    </span>
  );
}

function Swatch({ theme }: { theme: string }) {
  return (
    <span className="flex h-8 w-11 shrink-0 overflow-hidden rounded-sm border border-border">
      {theme === "system" ? (
        <>
          <PagePreview theme="light" className="w-1/2 px-1" />
          <PagePreview theme="dark" className="w-1/2 px-1" />
        </>
      ) : (
        <PagePreview theme={theme} className="w-full" />
      )}
    </span>
  );
}

const emptySubscribe = () => () => {};

// False during SSR and the first client render, true thereafter — a
// hydration-safe "mounted" flag without setState-in-effect.
function useMounted() {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  // Only reflect the stored selection after mount to avoid hydration mismatch.
  const selected = mounted ? theme : undefined;

  return (
    <Menu.Root>
      <Menu.Trigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Change reading theme"
          />
        }
      >
        <Palette />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="end" className="z-50">
          <Menu.Popup className="w-64 origin-[var(--transform-origin)] rounded-(--radius-card) border border-border bg-popover p-1.5 text-popover-foreground outline-none transition-[transform,opacity] duration-(--dur-short) data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            <Menu.Group>
              <Menu.GroupLabel className="px-2.5 pt-1.5 pb-2 font-serif text-sm text-muted-foreground">
                Reading theme
              </Menu.GroupLabel>
              <Menu.RadioGroup
                value={selected}
                onValueChange={(value) => setTheme(value as string)}
              >
                <RadioOption value="system" label="System" hint="Match this device" />
                {THEMES.map((option) => (
                  <RadioOption key={option.value} {...option} />
                ))}
              </Menu.RadioGroup>
            </Menu.Group>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function RadioOption({ value, label, hint }: ThemeOption) {
  return (
    <Menu.RadioItem
      value={value}
      closeOnClick
      className={cn(
        "flex min-h-12 cursor-default items-center gap-3 rounded-sm px-2.5 py-1.5 outline-none select-none",
        "data-[highlighted]:bg-muted data-[highlighted]:text-foreground"
      )}
    >
      <Swatch theme={value} />
      <span className="flex min-w-0 flex-col">
        <span className="font-serif text-base leading-snug">{label}</span>
        <span className="font-serif text-sm leading-snug text-muted-foreground">{hint}</span>
      </span>
      <Menu.RadioItemIndicator className="ml-auto flex text-primary">
        <Check className="size-4" />
      </Menu.RadioItemIndicator>
    </Menu.RadioItem>
  );
}
