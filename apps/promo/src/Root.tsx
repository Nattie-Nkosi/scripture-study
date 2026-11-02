import { Composition } from "remotion";

import { Promo, promoDuration, type PromoProps } from "./Promo";
import timeline from "./timeline.json";

const defaults: PromoProps = { url: "" };

export function Root() {
  return (
    <>
      {/* 9:16 for TikTok, Reels, WhatsApp Status, LinkedIn mobile */}
      <Composition id="Promo" component={Promo} durationInFrames={promoDuration} fps={timeline.fps} width={1080} height={1920} defaultProps={defaults} />
      {/* 4:5 for the Facebook and LinkedIn feeds */}
      <Composition id="PromoFeed" component={Promo} durationInFrames={promoDuration} fps={timeline.fps} width={1080} height={1350} defaultProps={defaults} />
    </>
  );
}
