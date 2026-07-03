"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Download, Share2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const CARD = 1080;

type Bg =
  | { kind: "radial"; inner: string; outer: string }
  | { kind: "linear"; top: string; bottom: string };

type Preset = {
  key: string;
  label: string;
  chip: string;
  bg: Bg;
  ink: string;
  accent: string;
  sub: string;
  frame: string;
};

// Card palettes are fixed (independent of the reader's active theme) so a shared
// card looks the same to everyone — drawn from the app's own warm garnet/gold set.
const PRESETS: Preset[] = [
  {
    key: "paper",
    label: "Paper",
    chip: "#faf8f2",
    bg: { kind: "radial", inner: "#fdfbf6", outer: "#efe6d4" },
    ink: "#3b352e",
    accent: "#8a2f28",
    sub: "#a99f8d",
    frame: "#dccdb4",
  },
  {
    key: "garnet",
    label: "Garnet",
    chip: "#7c2b26",
    bg: { kind: "linear", top: "#853029", bottom: "#591d1a" },
    ink: "#f6ece0",
    accent: "#e7c58c",
    sub: "rgba(246,236,224,0.62)",
    frame: "rgba(231,197,140,0.34)",
  },
  {
    key: "twilight",
    label: "Twilight",
    chip: "#2a3157",
    bg: { kind: "linear", top: "#2a3157", bottom: "#1a1f37" },
    ink: "#efe6d0",
    accent: "#d9b25f",
    sub: "rgba(239,230,208,0.6)",
    frame: "rgba(217,178,95,0.32)",
  },
];

type Fonts = { serif: string; sans: string };

// next/font exposes each face's hashed family name through a CSS variable, so the
// canvas draws with the very same Lora the reader is already showing.
function readFonts(): Fonts {
  const cs = getComputedStyle(document.documentElement);
  const lora = cs.getPropertyValue("--font-lora").trim();
  const geist = cs.getPropertyValue("--font-geist-sans").trim();
  return {
    serif: lora ? `${lora}, Georgia, serif` : "Georgia, serif",
    sans: geist ? `${geist}, system-ui, sans-serif` : "system-ui, sans-serif",
  };
}

type Ctx2D = CanvasRenderingContext2D & { letterSpacing?: string };

function paintBg(ctx: Ctx2D, bg: Bg) {
  if (bg.kind === "radial") {
    const g = ctx.createRadialGradient(CARD / 2, CARD * 0.44, 120, CARD / 2, CARD / 2, CARD * 0.72);
    g.addColorStop(0, bg.inner);
    g.addColorStop(1, bg.outer);
    ctx.fillStyle = g;
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, CARD);
    g.addColorStop(0, bg.top);
    g.addColorStop(1, bg.bottom);
    ctx.fillStyle = g;
  }
  ctx.fillRect(0, 0, CARD, CARD);
}

function ornament(ctx: Ctx2D, cx: number, y: number, color: string) {
  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 92, y);
  ctx.lineTo(cx - 18, y);
  ctx.moveTo(cx + 18, y);
  ctx.lineTo(cx + 92, y);
  ctx.stroke();
  ctx.translate(cx, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-7, -7, 14, 14);
  ctx.restore();
}

function wrap(ctx: Ctx2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawCard(
  canvas: HTMLCanvasElement,
  preset: Preset,
  data: { reference: string; text: string; isSimple: boolean; fonts: Fonts },
) {
  const ctx = canvas.getContext("2d") as Ctx2D | null;
  if (!ctx) return;
  const { serif, sans } = data.fonts;

  ctx.clearRect(0, 0, CARD, CARD);
  paintBg(ctx, preset.bg);

  if (typeof ctx.roundRect === "function") {
    ctx.strokeStyle = preset.frame;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(46, 46, CARD - 92, CARD - 92, 28);
    ctx.stroke();
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(62, 62, CARD - 124, CARD - 124, 20);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ornament(ctx, CARD / 2, 208, preset.accent);

  const maxTextWidth = CARD - 2 * 140;
  const regionTop = 300;
  const regionBottom = CARD - 176;
  const refReserve = 150;
  const maxTextHeight = regionBottom - regionTop - refReserve;

  let fontPx = 66;
  let lines: string[] = [];
  for (; fontPx >= 30; fontPx -= 2) {
    ctx.font = `500 ${fontPx}px ${serif}`;
    lines = wrap(ctx, data.text, maxTextWidth);
    if (lines.length * fontPx * 1.4 <= maxTextHeight && lines.length <= 14) break;
  }

  ctx.font = `500 ${fontPx}px ${serif}`;
  const lineH = fontPx * 1.4;
  const maxLines = Math.max(1, Math.floor(maxTextHeight / lineH));
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    let last = lines[maxLines - 1];
    while (last.length && ctx.measureText(`${last}…`).width > maxTextWidth) {
      last = last.slice(0, -1).trimEnd();
    }
    lines[maxLines - 1] = `${last}…`;
  }

  const textAreaTop = regionTop;
  const textAreaBottom = regionBottom - refReserve;
  const textHeight = lines.length * lineH;
  const firstCenter = textAreaTop + (textAreaBottom - textAreaTop - textHeight) / 2 + lineH / 2;

  ctx.fillStyle = preset.ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((ln, i) => ctx.fillText(ln, CARD / 2, firstCenter + i * lineH));

  const textBottom = textAreaTop + (textAreaBottom - textAreaTop + textHeight) / 2;

  const ruleY = textBottom + 62;
  ctx.strokeStyle = preset.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(CARD / 2 - 48, ruleY);
  ctx.lineTo(CARD / 2 + 48, ruleY);
  ctx.stroke();

  ctx.fillStyle = preset.accent;
  ctx.font = `600 32px ${sans}`;
  ctx.letterSpacing = "4px";
  ctx.fillText(data.reference.toUpperCase(), CARD / 2, ruleY + 56);
  ctx.letterSpacing = "0px";

  if (data.isSimple) {
    ctx.fillStyle = preset.sub;
    ctx.font = `400 25px ${sans}`;
    ctx.fillText("Simple English paraphrase", CARD / 2, ruleY + 98);
  }

  ctx.fillStyle = preset.sub;
  ctx.font = `600 24px ${sans}`;
  ctx.letterSpacing = "5px";
  ctx.fillText("SCRIPTURE STUDY", CARD / 2, CARD - 92);
  ctx.letterSpacing = "0px";
}

function slugify(ref: string): string {
  const s = ref
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "verse";
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

const emptySubscribe = () => () => {};

function useCanShareImage(): boolean {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => {
      if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") {
        return false;
      }
      try {
        const probe = new File([new Blob([], { type: "image/png" })], "v.png", {
          type: "image/png",
        });
        return navigator.canShare({ files: [probe] });
      } catch {
        return false;
      }
    },
    () => false,
  );
}

function useCanCopyImage(): boolean {
  return React.useSyncExternalStore(
    emptySubscribe,
    () =>
      typeof window !== "undefined" &&
      typeof ClipboardItem !== "undefined" &&
      typeof navigator.clipboard?.write === "function",
    () => false,
  );
}

/** A shareable image of a verse (or a selected range), rendered entirely on the
 *  client to a canvas — no server, no tokens, works offline. The reader picks a
 *  palette, then downloads, copies, or shares the PNG. */
export function VerseCard({
  reference,
  text,
  isSimple,
  onClose,
}: {
  reference: string;
  text: string;
  isSimple: boolean;
  onClose: () => void;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [preset, setPreset] = React.useState(0);
  const [copied, setCopied] = React.useState(false);
  const canShare = useCanShareImage();
  const canCopy = useCanCopyImage();

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fonts = readFonts();
    const paint = () => {
      if (canvasRef.current) {
        drawCard(canvasRef.current, PRESETS[preset], { reference, text, isSimple, fonts });
      }
    };
    paint();
    // Redraw once the serif has definitely parsed, in case it wasn't ready yet.
    document.fonts?.ready.then(paint).catch(() => {});
  }, [preset, reference, text, isSimple]);

  // Escape to close + background scroll lock, mirroring the command palette.
  React.useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const { body } = document;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [onClose]);

  async function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await canvasToBlob(canvas);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(reference)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function share() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await canvasToBlob(canvas);
    if (!blob) return;
    const file = new File([blob], `${slugify(reference)}.png`, { type: "image/png" });
    try {
      await navigator.share({ files: [file], title: reference });
    } catch {
      // The reader dismissed the share sheet — nothing to do.
    }
  }

  async function copyImage() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await canvasToBlob(canvas);
      if (!blob) return;
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard image write not available — the Download button still works.
    }
  }

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 100 }}>
      <div
        onClick={onClose}
        className="bg-black/50 animate-in fade-in"
        style={{ position: "absolute", inset: 0 }}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share verse as an image"
        style={{
          position: "absolute",
          left: "1rem",
          right: "1rem",
          top: "50%",
          transform: "translateY(-50%)",
          marginInline: "auto",
          maxHeight: "92vh",
        }}
        className="flex max-w-md flex-col overflow-y-auto rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-2xl shadow-black/20 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold">Share as a card</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mx-auto w-full max-w-[340px]">
          <canvas
            ref={canvasRef}
            width={CARD}
            height={CARD}
            aria-label={`Verse card for ${reference}`}
            className="w-full rounded-xl border border-border shadow-md"
          />
        </div>

        <div className="mt-3 flex items-center justify-center gap-2">
          {PRESETS.map((p, i) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPreset(i)}
              aria-label={`${p.label} style`}
              aria-pressed={preset === i}
              title={p.label}
              className={cn(
                "size-7 rounded-full border border-black/10 transition-transform",
                preset === i ? "ring-2 ring-ring ring-offset-2 ring-offset-popover" : "hover:scale-105",
              )}
              style={{ backgroundColor: p.chip }}
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button size="sm" onClick={download}>
            <Download className="size-4" /> Download
          </Button>
          {canCopy && (
            <Button size="sm" variant="outline" onClick={copyImage}>
              {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy image"}
            </Button>
          )}
          {canShare && (
            <Button size="sm" variant="outline" onClick={share}>
              <Share2 className="size-4" /> Share
            </Button>
          )}
        </div>

        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          A 1080×1080 image, saved on your device — nothing is uploaded.
        </p>
      </div>
    </div>,
    document.body,
  );
}
