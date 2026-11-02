import { interpolate, useCurrentFrame } from "remotion";

import { highlight, paper, sans } from "../theme";
import { Headline, Stage, ease, rise, useSpring } from "../ui";

const VERSE =
  "nd it came to pass that I, Nephi, said unto my father: I will go and do the things which the Lord hath commanded, for I know that the Lord giveth no commandments unto the children of men, save he shall prepare a way for them that they may accomplish the thing which he commandeth them.";
const WORDS = VERSE.split(" ");
const MARK_FROM = WORDS.indexOf("will") - 1;
const MARK_TO = WORDS.indexOf("commanded,");

export function Reader() {
  const frame = useCurrentFrame();
  const page = useSpring(14, 18);
  const note = useSpring(128, 14);

  return (
    <Stage>
      <Headline size={84}>The standard works, set like a fine book.</Headline>

      <div
        style={{
          marginTop: 72,
          background: paper.card,
          border: `1px solid ${paper.rule}`,
          borderRadius: 10,
          padding: "64px 64px 64px 112px",
          boxShadow: "0 30px 60px -30px oklch(0.3 0.04 50 / 0.35)",
          opacity: page,
          transform: `translateY(${(1 - page) * 80}px)`,
        }}
      >
        <div style={{ fontFamily: sans, fontSize: 26, color: paper.muted, ...rise(frame, 20) }}>The Book of Mormon</div>
        <div style={{ fontSize: 76, fontWeight: 300, letterSpacing: "-0.02em", marginTop: 8, ...rise(frame, 24) }}>
          1 Nephi <span style={{ color: paper.signal }}>3</span>
        </div>

        <p style={{ position: "relative", margin: "40px 0 0", fontSize: 40, lineHeight: 1.6 }}>
          <span style={{ position: "absolute", left: -58, top: 6, fontSize: 28, color: paper.signal, ...rise(frame, 30, 10) }}>7</span>
          <span
            style={{
              float: "left",
              fontSize: 132,
              lineHeight: 0.82,
              marginRight: 12,
              marginTop: 10,
              color: paper.signal,
              ...rise(frame, 30, 14),
            }}
          >
            A
          </span>
          {WORDS.map((w, i) => {
            const t = 34 + i * 1.3;
            const shown = interpolate(frame, [t, t + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const marked = i >= MARK_FROM && i <= MARK_TO;
            const sweepStart = 104 + (i - MARK_FROM) * 1.6;
            const sweep = marked
              ? interpolate(frame, [sweepStart, sweepStart + 5], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease })
              : 0;
            return (
              <span
                key={i}
                style={{
                  opacity: shown,
                  backgroundImage: `linear-gradient(${highlight}, ${highlight})`,
                  backgroundRepeat: "no-repeat",
                  backgroundSize: `${sweep}% 78%`,
                  backgroundPosition: "0 70%",
                }}
              >
                {w}
                {i < WORDS.length - 1 ? " " : ""}
              </span>
            );
          })}
        </p>

        <div
          style={{
            marginTop: 40,
            borderLeft: `3px solid ${paper.signal}`,
            paddingLeft: 28,
            fontSize: 34,
            fontStyle: "italic",
            color: paper.muted,
            opacity: note,
            transform: `translateX(${(1 - note) * 40}px)`,
          }}
        >
          My note: read this before every hard thing.
        </div>
      </div>
    </Stage>
  );
}
