import { interpolate, useCurrentFrame } from "remotion";

import { paper, sans } from "../theme";
import { Headline, Stage, ease, rise } from "../ui";

const SESSIONS = Array.from({ length: (2026 - 1971 + 1) * 2 }, (_, i) => `${i % 2 ? "October" : "April"} ${1971 + Math.floor(i / 2)}`);
const ROW = 92;

export function Conference() {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [8, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const year = Math.round(2026 - p * (2026 - 1971));
  const scroll = (1 - p) * (SESSIONS.length - 5) * ROW;

  return (
    <Stage>
      <Headline size={88}>Every General Conference talk since</Headline>

      <div
        style={{
          fontSize: 300,
          fontWeight: 300,
          lineHeight: 1,
          letterSpacing: "-0.04em",
          color: paper.signal,
          fontVariantNumeric: "tabular-nums",
          marginTop: 12,
          ...rise(frame, 4),
        }}
      >
        {year}
      </div>

      <div
        style={{
          marginTop: 40,
          height: ROW * 5,
          overflow: "hidden",
          maskImage: "linear-gradient(transparent, black 25%, black 75%, transparent)",
          ...rise(frame, 10),
        }}
      >
        <div style={{ transform: `translateY(${-scroll}px)` }}>
          {SESSIONS.map((s, i) => (
            <div
              key={s}
              style={{
                height: ROW,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: `1px solid ${paper.rule}`,
                fontSize: 44,
              }}
            >
              <span>{s} general conference</span>
              <span style={{ fontFamily: sans, fontSize: 26, color: paper.muted }}>{i % 2 ? "Fall" : "Spring"}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 40, fontSize: 46, fontStyle: "italic", color: paper.muted, ...rise(frame, 118) }}>
        Browse by conference or by speaker.
      </div>
    </Stage>
  );
}
