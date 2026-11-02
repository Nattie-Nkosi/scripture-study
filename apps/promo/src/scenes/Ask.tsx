import { interpolate, useCurrentFrame } from "remotion";

import { paper, sans } from "../theme";
import { Headline, Stage, useSpring } from "../ui";

const QUESTION = "Where do I find peace when life feels heavy?";

const ANSWER: { text: string; cite?: boolean }[] = [
  { text: "The Savior promises it directly: “Peace I leave with you, my peace I give unto you” (" },
  { text: "John 14:27", cite: true },
  { text: "). He also invites, “Learn of me, and listen to my words; walk in the meekness of my Spirit, and you shall have peace in me” (" },
  { text: "D&C 19:23", cite: true },
  { text: ")." },
];

const TYPE_START = 16;
const ANSWER_START = 62;
const CHARS_PER_FRAME = 2.6;

export function Ask() {
  const frame = useCurrentFrame();
  const typed = Math.floor(Math.max(0, frame - TYPE_START) * 1.4);
  const streamed = Math.max(0, frame - ANSWER_START) * CHARS_PER_FRAME;
  const thinking = frame > TYPE_START + QUESTION.length / 1.4 && frame < ANSWER_START;
  const chips = useSpring(150, 14);

  let budget = streamed;
  return (
    <Stage>
      <Headline size={88}>Ask anything. Answers come from the text.</Headline>

      <div style={{ marginTop: 80, display: "flex", flexDirection: "column", gap: 56 }}>
        <div
          style={{
            alignSelf: "flex-end",
            maxWidth: "88%",
            textAlign: "right",
            fontStyle: "italic",
            fontSize: 48,
            lineHeight: 1.35,
            borderRight: `3px solid ${paper.signal}`,
            paddingRight: 28,
            minHeight: 65,
          }}
        >
          {QUESTION.slice(0, typed)}
          {typed < QUESTION.length && <Caret />}
        </div>

        <div style={{ fontSize: 44, lineHeight: 1.55, minHeight: 480 }}>
          {thinking && <Dots frame={frame} />}
          {ANSWER.map((seg, i) => {
            const shown = seg.text.slice(0, Math.max(0, Math.floor(budget)));
            budget -= seg.text.length;
            if (!shown) return null;
            return seg.cite ? (
              <span
                key={i}
                style={{ whiteSpace: "nowrap", color: paper.signal, textDecoration: "underline dotted", textUnderlineOffset: "0.22em", textDecorationThickness: 3 }}
              >
                {shown}
              </span>
            ) : (
              <span key={i}>{shown}</span>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 20, fontFamily: sans, fontSize: 28, opacity: chips, transform: `translateY(${(1 - chips) * 30}px)` }}>
          <span style={{ color: paper.muted, alignSelf: "center" }}>Sources</span>
          {["John 14:27", "D&C 19:23"].map((c) => (
            <span key={c} style={{ border: `1.5px solid ${paper.rule}`, borderRadius: 999, padding: "12px 26px", background: paper.card }}>
              {c}
            </span>
          ))}
        </div>
      </div>
    </Stage>
  );
}

function Caret() {
  const frame = useCurrentFrame();
  return <span style={{ opacity: Math.floor(frame / 8) % 2 ? 0 : 1, color: paper.signal }}>|</span>;
}

function Dots({ frame }: { frame: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 14 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 16,
            height: 16,
            borderRadius: 99,
            background: paper.signal,
            opacity: interpolate(Math.sin((frame - i * 4) / 3), [-1, 1], [0.25, 1]),
          }}
        />
      ))}
    </span>
  );
}
