import { interpolate, useCurrentFrame } from "remotion";

import { paper, sans, signalFill } from "../theme";
import { LogoMark, Ornament, Stage, rise, useSpring } from "../ui";

const FACTS = ["Free to use", "No account needed", "Your notes stay on your device"];

export function End({ url }: { url?: string }) {
  const frame = useCurrentFrame();
  const pop = useSpring(0, 14);
  const fadeOut = interpolate(frame, [158, 180], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Stage>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", opacity: fadeOut }}>
        <div style={{ transform: `scale(${pop})` }}>
          <LogoMark size={170} />
        </div>
        <h1 style={{ margin: "48px 0 0", fontWeight: 300, fontSize: 128, lineHeight: 1, letterSpacing: "-0.03em", ...rise(frame, 8) }}>
          Scripture Study
        </h1>
        <div style={{ marginTop: 28, fontSize: 48, fontStyle: "italic", color: paper.muted, ...rise(frame, 16) }}>
          A clearer way to read scripture.
        </div>

        <div style={{ marginTop: 56, width: "100%", borderBottom: `1px solid ${paper.rule}` }}>
          {FACTS.map((f, i) => (
            <div
              key={f}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 22, padding: "24px 0", borderTop: `1px solid ${paper.rule}`, fontSize: 42, ...rise(frame, 30 + i * 8, 14) }}
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={paper.signal} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5 10 17.5 19 7" />
              </svg>
              {f}
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 64,
            background: signalFill,
            color: "oklch(0.98 0.012 85)",
            borderRadius: 10,
            padding: "30px 64px",
            fontSize: 50,
            ...rise(frame, 62, 16),
          }}
        >
          Open the library
        </div>
        {url && <div style={{ marginTop: 30, fontFamily: sans, fontSize: 36, color: paper.ink, ...rise(frame, 70) }}>{url}</div>}
        <div style={{ marginTop: 52, ...rise(frame, 76) }}>
          <Ornament color={paper.signal} />
        </div>
      </div>
    </Stage>
  );
}
