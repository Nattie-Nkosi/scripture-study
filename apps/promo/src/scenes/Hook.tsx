import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { plate, sans, serif } from "../theme";
import { ease, rise, useSpring } from "../ui";

const CLUTTER = [
  { text: "Twelve tabs open.", font: sans, rotate: -4, x: -30, delay: 4 },
  { text: "Three different apps.", font: "ui-monospace, Consolas, monospace", rotate: 3, x: 0, delay: 20 },
  { text: "A notebook you can't find.", font: serif, rotate: -2, x: -10, delay: 36 },
];

export function Hook() {
  const frame = useCurrentFrame();
  const { height, width } = useVideoConfig();
  const tall = height / width > 1.5;
  const strike = interpolate(frame, [62, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const clear = interpolate(frame, [80, 94], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: plate, color: "oklch(0.95 0.01 84)", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: tall ? 56 : 40, alignItems: "center", opacity: clear, marginTop: tall ? -160 : 0 }}>
        {CLUTTER.map((c) => (
          <ClutterLine key={c.text} {...c} strike={strike} />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          fontFamily: serif,
          fontWeight: 300,
          fontSize: 104,
          lineHeight: 1.05,
          letterSpacing: "-0.025em",
          textAlign: "center",
          padding: "0 90px",
          marginTop: tall ? -160 : 0,
          ...rise(frame, 92, 20),
        }}
      >
        There is a calmer way to study.
      </div>
    </AbsoluteFill>
  );
}

function ClutterLine({ text, font, rotate, x, delay, strike }: (typeof CLUTTER)[number] & { strike: number }) {
  const s = useSpring(delay, 11);
  const frame = useCurrentFrame();
  const jitter = Math.sin((frame + delay) * 0.9) * 3 * (1 - strike);
  return (
    <div
      style={{
        position: "relative",
        fontFamily: font,
        fontSize: 72,
        fontWeight: 500,
        padding: "18px 34px",
        border: "2px solid oklch(1 0 0 / 22%)",
        borderRadius: 14,
        background: "oklch(1 0 0 / 6%)",
        transform: `translate(${x + jitter}px, ${(1 - s) * 80}px) rotate(${rotate}deg) scale(${0.6 + s * 0.4})`,
        opacity: s,
        whiteSpace: "nowrap",
      }}
    >
      {text}
      <div
        style={{
          position: "absolute",
          left: 20,
          right: 20,
          top: "52%",
          height: 7,
          borderRadius: 4,
          background: "oklch(0.62 0.14 25)",
          transformOrigin: "left center",
          transform: `scaleX(${strike})`,
        }}
      />
    </div>
  );
}
