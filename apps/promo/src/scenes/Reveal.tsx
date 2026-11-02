import { interpolate, useCurrentFrame } from "remotion";

import { paper, serif } from "../theme";
import { Ornament, LogoMark, Stage, ease, rise, useSpring } from "../ui";

export function Reveal() {
  const frame = useCurrentFrame();
  const pop = useSpring(2, 13);
  const draw = interpolate(frame, [10, 52], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

  return (
    <Stage justify="center">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ transform: `scale(${pop}) rotate(${(1 - pop) * -14}deg)` }}>
          <LogoMark size={220} draw={draw} />
        </div>
        <div style={{ marginTop: 56, fontSize: 64, fontWeight: 500, letterSpacing: "-0.01em", ...rise(frame, 40) }}>Scripture Study</div>
        <div style={{ marginTop: 40, ...rise(frame, 52) }}>
          <Ornament color={paper.signal} />
        </div>
        <h1
          style={{
            margin: "48px 0 0",
            fontFamily: serif,
            fontWeight: 300,
            fontSize: 120,
            lineHeight: 1.02,
            letterSpacing: "-0.03em",
            ...rise(frame, 64, 22),
          }}
        >
          A clearer way
          <br />
          to read scripture
        </h1>
      </div>
    </Stage>
  );
}
