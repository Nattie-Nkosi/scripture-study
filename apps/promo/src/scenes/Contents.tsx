import { useCurrentFrame } from "remotion";

import { paper } from "../theme";
import { Headline, Stage, rise } from "../ui";

const SECTIONS = [
  ["Library", "Old Testament to Pearl of Great Price"],
  ["General Conference", "Talks by conference or speaker"],
  ["Come, Follow Me", "This week's lesson, ready to open"],
  ["Study Helps", "Bible Dictionary, Topical Guide, JST"],
  ["Church Organization", "A map from the General Handbook"],
  ["Ask", "A study assistant grounded in the text"],
  ["My study", "Highlights, notes, and bookmarks"],
];
const NUMERALS = ["i", "ii", "iii", "iv", "v", "vi", "vii"];

export function Contents() {
  const frame = useCurrentFrame();
  return (
    <Stage>
      <Headline size={88}>And everything else, in one calm edition.</Headline>
      <ol style={{ listStyle: "none", margin: "64px 0 0", padding: 0, borderBottom: `1px solid ${paper.rule}` }}>
        {SECTIONS.map(([label, desc], i) => (
          <li
            key={label}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 30,
              padding: "24px 0",
              borderTop: `1px solid ${paper.rule}`,
              ...rise(frame, 14 + i * 9, 14),
            }}
          >
            <span style={{ width: 52, flexShrink: 0, fontSize: 32, fontStyle: "italic", color: paper.signal }}>{NUMERALS[i]}.</span>
            <span>
              <span style={{ display: "block", fontSize: 48, lineHeight: 1.15 }}>{label}</span>
              <span style={{ display: "block", fontSize: 30, color: paper.muted, marginTop: 6 }}>{desc}</span>
            </span>
          </li>
        ))}
      </ol>
    </Stage>
  );
}
