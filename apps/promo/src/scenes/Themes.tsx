import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

import { sans, themes, type Palette } from "../theme";
import { Grain, Headline, Ornament, Stage, ease, rise } from "../ui";

const HOLD = 22;
const FADE = 8;
const SHARE_AT = 118;

// Each theme is a full layer; crossfading layers avoids interpolating oklch colours.
export function Themes() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      {themes.map((t, i) => {
        const start = i * HOLD;
        const opacity = interpolate(frame, [start, start + FADE], [i === 0 ? 1 : 0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <AbsoluteFill key={t.name} style={{ opacity }}>
            <Layer palette={t} index={i} />
          </AbsoluteFill>
        );
      })}
      {frame >= SHARE_AT && (
        <AbsoluteFill style={{ opacity: interpolate(frame, [SHARE_AT, SHARE_AT + 10], [0, 1], { extrapolateRight: "clamp" }) }}>
          <Layer palette={themes[0]} index={0} share />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

function Layer({ palette, index, share = false }: { palette: Palette; index: number; share?: boolean }) {
  const frame = useCurrentFrame();
  const lift = share
    ? interpolate(frame, [SHARE_AT, SHARE_AT + 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease })
    : 0;

  return (
    <Stage palette={palette} grain={false}>
      {index < 2 && <Grain />}
      <Headline size={92} palette={palette} start={share ? SHARE_AT : 0}>
        {share ? "Then share it as a card." : "Read by day. Read by night."}
      </Headline>

      <div style={{ marginTop: 72, ...rise(frame, 6) }}>
      <div
        style={{
          background: palette.card,
          border: `1px solid ${palette.rule}`,
          borderRadius: 18,
          padding: "88px 72px",
          textAlign: "center",
          transform: `rotate(${lift * -3}deg) scale(${1 - lift * 0.06}) translateY(${lift * -10}px)`,
          boxShadow: `0 ${20 + lift * 40}px ${50 + lift * 60}px -30px oklch(0.2 0.03 40 / ${0.3 + lift * 0.25})`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Ornament color={palette.signal} width={180} />
        </div>
        <p style={{ margin: "48px 0 0", fontSize: 66, lineHeight: 1.3, fontWeight: 300, letterSpacing: "-0.015em", color: palette.ink, textWrap: "balance" }}>
          By small and simple things are great things brought to pass.
        </p>
        <div style={{ marginTop: 40, fontSize: 34, fontStyle: "italic", color: palette.signal }}>Alma 37:6</div>
      </div>
      </div>

      <div style={{ marginTop: 56, display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: sans, fontSize: 30, color: palette.muted }}>
        {share ? (
          <span style={{ display: "flex", gap: 20 }}>
            {["Download", "Copy", "Share"].map((a, i) => (
              <span
                key={a}
                style={{
                  border: `1.5px solid ${palette.rule}`,
                  borderRadius: 999,
                  padding: "12px 26px",
                  color: i === 2 ? "oklch(0.98 0.012 85)" : palette.ink,
                  background: i === 2 ? palette.signal : palette.card,
                  ...rise(frame, SHARE_AT + 14 + i * 5, 12),
                }}
              >
                {a}
              </span>
            ))}
          </span>
        ) : (
          <>
            <span>{palette.name} theme</span>
            <span style={{ display: "flex", gap: 14 }}>
              {themes.map((t, i) => (
                <span
                  key={t.name}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 99,
                    background: t.paper,
                    border: `3px solid ${i === index ? palette.signal : palette.rule}`,
                  }}
                />
              ))}
            </span>
          </>
        )}
      </div>
    </Stage>
  );
}
