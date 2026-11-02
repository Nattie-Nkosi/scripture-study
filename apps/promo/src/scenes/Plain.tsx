import { interpolate, useCurrentFrame } from "remotion";

import { paper, sans } from "../theme";
import { Headline, Stage, ease, rise, useSpring } from "../ui";

const ORIGINAL =
  "For I know that the Lord giveth no commandments unto the children of men, save he shall prepare a way for them that they may accomplish the thing which he commandeth them.";
const SIMPLE =
  "I know the Lord never gives people a commandment without first preparing a way for them to do it.";

export function Plain() {
  const frame = useCurrentFrame();
  const panel = useSpring(10, 18);
  const flip = interpolate(frame, [62, 84], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

  return (
    <Stage>
      <Headline size={92}>
        Hard passage?
        <br />
        Read it plainly.
      </Headline>

      <div style={{ marginTop: 72, opacity: panel, transform: `translateY(${(1 - panel) * 60}px)` }}>
        <Toggle flip={flip} />

        <div style={{ position: "relative", marginTop: 56, minHeight: 420 }}>
          <p
            style={{
              position: "absolute",
              margin: 0,
              fontSize: 50,
              lineHeight: 1.5,
              opacity: 1 - flip,
              filter: `blur(${flip * 10}px)`,
              transform: `translateY(${flip * -30}px)`,
            }}
          >
            {ORIGINAL}
          </p>
          <p
            style={{
              position: "absolute",
              margin: 0,
              fontSize: 58,
              lineHeight: 1.45,
              opacity: flip,
              filter: `blur(${(1 - flip) * 10}px)`,
              transform: `translateY(${(1 - flip) * 30}px)`,
            }}
          >
            {SIMPLE}
          </p>
        </div>

        <div style={{ fontFamily: sans, fontSize: 28, color: paper.muted, ...rise(frame, 100) }}>
          1 Nephi 3:7 · Simple English, with the original one tap away
        </div>
      </div>
    </Stage>
  );
}

function Toggle({ flip }: { flip: number }) {
  const w = 300;
  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        fontFamily: sans,
        fontSize: 30,
        border: `1.5px solid ${paper.rule}`,
        borderRadius: 999,
        padding: 6,
        background: paper.card,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 6,
          left: 6 + flip * w,
          width: w,
          bottom: 6,
          borderRadius: 999,
          background: paper.signal,
        }}
      />
      {["Original", "Simple English"].map((label, i) => {
        const active = i === 0 ? 1 - flip : flip;
        return (
          <div
            key={label}
            style={{
              position: "relative",
              width: w,
              textAlign: "center",
              padding: "16px 0",
              color: active > 0.5 ? "oklch(0.98 0.012 85)" : paper.muted,
            }}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}
