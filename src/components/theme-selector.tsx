"use client";

import * as React from "react";
import { Menu } from "@base-ui/react/menu";
import { Check, Monitor, Palette } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ThemeOption = {
  value: string;
  label: string;
  hint: string;
  swatch: { bg: string; ink: string };
};

// Swatch colors are hardcoded so each option previews its own palette
// regardless of the theme currently applied to the menu.
const THEMES: ThemeOption[] = [
  {
    value: "light",
    label: "Paper",
    hint: "Bright cream",
    swatch: { bg: "oklch(0.985 0.009 83)", ink: "oklch(0.45 0.125 25)" },
  },
  {
    value: "sepia",
    label: "Sepia",
    hint: "Warm aged paper",
    swatch: { bg: "oklch(0.905 0.048 79)", ink: "oklch(0.44 0.14 30)" },
  },
  {
    value: "dark",
    label: "Dark",
    hint: "Warm charcoal",
    swatch: { bg: "oklch(0.19 0.012 60)", ink: "oklch(0.62 0.14 25)" },
  },
  {
    value: "night",
    label: "Night",
    hint: "True black, OLED",
    swatch: { bg: "oklch(0 0 0)", ink: "oklch(0.64 0.15 25)" },
  },
  {
    value: "twilight",
    label: "Twilight",
    hint: "Indigo & gold",
    swatch: { bg: "oklch(0.215 0.048 264)", ink: "oklch(0.8 0.13 84)" },
  },
];

function Swatch({ option }: { option: ThemeOption }) {
  return (
    <span
      className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border/70"
      style={{ background: option.swatch.bg }}
    >
      <span
        className="size-2 rounded-full"
        style={{ background: option.swatch.ink }}
      />
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
          <Menu.Popup className="min-w-52 origin-[var(--transform-origin)] rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg shadow-black/5 outline-none transition-[transform,opacity] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            <p className="small-caps px-2 pt-1 pb-1.5 text-xs text-muted-foreground">
              Reading theme
            </p>
            <Menu.RadioGroup
              value={selected}
              onValueChange={(value) => setTheme(value as string)}
            >
              <RadioOption
                value="system"
                label="System"
                hint="Match device"
                icon={
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border/70 bg-secondary text-muted-foreground">
                    <Monitor className="size-3" />
                  </span>
                }
              />
              {THEMES.map((option) => (
                <RadioOption
                  key={option.value}
                  value={option.value}
                  label={option.label}
                  hint={option.hint}
                  icon={<Swatch option={option} />}
                />
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function RadioOption({
  value,
  label,
  hint,
  icon,
}: {
  value: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <Menu.RadioItem
      value={value}
      closeOnClick
      className={cn(
        "flex cursor-default items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm outline-none select-none",
        "data-[highlighted]:bg-muted data-[highlighted]:text-foreground"
      )}
    >
      {icon}
      <span className="flex flex-col leading-tight">
        <span className="font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </span>
      <Menu.RadioItemIndicator className="ml-auto flex text-primary">
        <Check className="size-4" />
      </Menu.RadioItemIndicator>
    </Menu.RadioItem>
  );
}
