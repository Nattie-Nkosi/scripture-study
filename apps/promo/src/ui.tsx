import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { paper, serif, type Palette } from "./theme";

export const ease = Easing.bezier(0.22, 1, 0.36, 1);

export function rise(frame: number, start: number, duration = 18) {
  const p = interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  return { opacity: p, transform: `translateY(${(1 - p) * 36}px)` };
}

export function useSpring(delay: number, damping = 16) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, mass: 0.7 } });
}

// Faint paper grain, like the light reading themes in the app.
export function Grain({ opacity = 0.07 }: { opacity?: number }) {
  return (
    <AbsoluteFill style={{ opacity, mixBlendMode: "multiply", pointerEvents: "none" }}>
      <svg width="100%" height="100%">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0.3  0 0 0 0 0.22  0 0 0 0 0.15  0 0 0 1 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
}

// Content sits above TikTok/Reels bottom chrome and clear of the right-hand action rail.
export function Stage({
  children,
  palette = paper,
  grain = true,
  justify = "center",
}: {
  children: React.ReactNode;
  palette?: Palette;
  grain?: boolean;
  justify?: React.CSSProperties["justifyContent"];
}) {
  const { height, width } = useVideoConfig();
  const tall = height / width > 1.5;
  return (
    <AbsoluteFill style={{ background: palette.paper, color: palette.ink, fontFamily: serif }}>
      {grain && <Grain />}
      <AbsoluteFill
        style={{
          padding: tall ? "200px 110px 360px 96px" : "90px 96px 90px 96px",
          display: "flex",
          flexDirection: "column",
          justifyContent: justify,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export function Headline({
  children,
  start = 0,
  size = 92,
  palette = paper,
  style,
}: {
  children: React.ReactNode;
  start?: number;
  size?: number;
  palette?: Palette;
  style?: React.CSSProperties;
}) {
  const frame = useCurrentFrame();
  return (
    <h1
      style={{
        margin: 0,
        fontFamily: serif,
        fontWeight: 300,
        fontSize: size,
        lineHeight: 1.04,
        letterSpacing: "-0.025em",
        color: palette.ink,
        textWrap: "balance",
        ...rise(frame, start),
        ...style,
      }}
    >
      {children}
    </h1>
  );
}

export function Ornament({ color, width = 220 }: { color: string; width?: number }) {
  return (
    <svg width={width} height={20} viewBox="0 0 220 20" style={{ display: "block" }}>
      <line x1="0" y1="10" x2="92" y2="10" stroke={color} strokeWidth="1.2" />
      <path d="M110 3 117 10 110 17 103 10Z" fill={color} />
      <line x1="128" y1="10" x2="220" y2="10" stroke={color} strokeWidth="1.2" />
    </svg>
  );
}

// The app mark from public/logo.svg, with the book drawn in as ink.
export function LogoMark({ size, draw = 1, color = "#8E3230", ink = "#FBF5E9" }: { size: number; draw?: number; color?: string; ink?: string }) {
  const stroke = (delay: number) => {
    const p = Math.min(1, Math.max(0, (draw - delay) / (1 - delay)));
    return { strokeDasharray: 1, strokeDashoffset: 1 - p };
  };
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill={color} />
      <g transform="translate(1.6 2.3) scale(1.2)">
        <path
          d="M12 3.4 13.7 5.1 12 6.8 10.3 5.1Z"
          fill={ink}
          style={{ opacity: draw > 0.85 ? 1 : 0, transition: "none" }}
        />
        <g fill="none" stroke={ink} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path pathLength={1} style={stroke(0)} d="M12 9.2C9.2 8 6.5 7.7 4.1 7.9 3.75 7.93 3.5 8.22 3.5 8.57V17.5c0 .35.26.64.61.61C6.5 17.9 9.2 18.2 12 19.4" />
          <path pathLength={1} style={stroke(0.15)} d="M12 9.2c2.8-1.2 5.5-1.5 7.9-1.3.35.03.6.32.6.67V17.5c0 .35-.26.64-.61.61C17.5 17.9 14.8 18.2 12 19.4" />
          <path pathLength={1} style={stroke(0.45)} d="M12 9.2V19.4" />
        </g>
      </g>
    </svg>
  );
}
