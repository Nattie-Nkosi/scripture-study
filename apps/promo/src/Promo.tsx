import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { TransitionSeries, linearTiming, springTiming, type TransitionPresentation } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";

import timeline from "./timeline.json";
import { Hook } from "./scenes/Hook";
import { Reveal } from "./scenes/Reveal";
import { Reader } from "./scenes/Reader";
import { Plain } from "./scenes/Plain";
import { Ask } from "./scenes/Ask";
import { Conference } from "./scenes/Conference";
import { Contents } from "./scenes/Contents";
import { Themes } from "./scenes/Themes";
import { End } from "./scenes/End";

export type PromoProps = { url?: string };

const T = timeline.transition;
const frames = Object.fromEntries(timeline.scenes.map((s) => [s.id, s.frames])) as Record<string, number>;

export const promoDuration = timeline.scenes.reduce((sum, s) => sum + s.frames, 0) - T * (timeline.scenes.length - 1);

const SCENES: { id: string; node: (p: PromoProps) => React.ReactNode }[] = [
  { id: "hook", node: () => <Hook /> },
  { id: "reveal", node: () => <Reveal /> },
  { id: "reader", node: () => <Reader /> },
  { id: "plain", node: () => <Plain /> },
  { id: "ask", node: () => <Ask /> },
  { id: "conference", node: () => <Conference /> },
  { id: "contents", node: () => <Contents /> },
  { id: "themes", node: () => <Themes /> },
  { id: "end", node: (p) => <End url={p.url} /> },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PRESENTATIONS: TransitionPresentation<any>[] = [
  wipe({ direction: "from-bottom" }),
  slide({ direction: "from-right" }),
  fade(),
  slide({ direction: "from-bottom" }),
  fade(),
  slide({ direction: "from-right" }),
  fade(),
  fade(),
];

export function Promo(props: PromoProps) {
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <TransitionSeries>
        {SCENES.flatMap((s, i) => {
          const items = [
            <TransitionSeries.Sequence key={s.id} durationInFrames={frames[s.id]}>
              {s.node(props)}
            </TransitionSeries.Sequence>,
          ];
          if (i < SCENES.length - 1) {
            items.push(
              <TransitionSeries.Transition
                key={`${s.id}-t`}
                presentation={PRESENTATIONS[i]}
                timing={i === 0 ? linearTiming({ durationInFrames: T }) : springTiming({ config: { damping: 200 }, durationInFrames: T })}
              />,
            );
          }
          return items;
        })}
      </TransitionSeries>
      <Audio src={staticFile("score.wav")} />
    </AbsoluteFill>
  );
}
