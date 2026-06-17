"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

const SIZES = ["1rem", "1.0625rem", "1.1875rem", "1.3125rem", "1.5rem", "1.6875rem"];
const DEFAULT_INDEX = 2; // matches --reader-font-size default in globals.css
const STORAGE_KEY = "reader-font-size-index";

export function FontSizeControl() {
  const [index, setIndex] = React.useState(DEFAULT_INDEX);

  React.useEffect(() => {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    if (Number.isInteger(saved) && saved >= 0 && saved < SIZES.length) {
      setIndex(saved);
    }
  }, []);

  React.useEffect(() => {
    document.documentElement.style.setProperty("--reader-font-size", SIZES[index]);
    localStorage.setItem(STORAGE_KEY, String(index));
  }, [index]);

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border px-0.5">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Decrease text size"
        disabled={index === 0}
        onClick={() => setIndex((i) => Math.max(0, i - 1))}
      >
        <Minus />
      </Button>
      <span className="select-none font-serif text-xs text-muted-foreground">Aa</span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Increase text size"
        disabled={index === SIZES.length - 1}
        onClick={() => setIndex((i) => Math.min(SIZES.length - 1, i + 1))}
      >
        <Plus />
      </Button>
    </div>
  );
}
