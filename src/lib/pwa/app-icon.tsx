import { ImageResponse } from "next/og";

// The open-book-and-spark mark (mirrors app/icon.svg + components/logo.tsx),
// rendered in the PWA's navy-and-gold identity for home-screen install.
const NAVY = "#0e192f";
const GOLD = "#e5b650";

const MARK = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none'>
  <path d='M12 3.4 13.7 5.1 12 6.8 10.3 5.1Z' fill='${GOLD}'/>
  <g fill='none' stroke='${GOLD}' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'>
    <path d='M12 9.2C9.2 8 6.5 7.7 4.1 7.9 3.75 7.93 3.5 8.22 3.5 8.57V17.5c0 .35.26.64.61.61C6.5 17.9 9.2 18.2 12 19.4'/>
    <path d='M12 9.2c2.8-1.2 5.5-1.5 7.9-1.3.35.03.6.32.6.67V17.5c0 .35-.26.64-.61.61C17.5 17.9 14.8 18.2 12 19.4'/>
    <path d='M12 9.2V19.4'/>
  </g>
</svg>`;

/** Render a square PNG app icon. Maskable icons keep the mark inside the safe
 *  zone (~80%) so launchers can crop to any shape without clipping it. */
export function renderAppIcon(size: number, maskable = false): ImageResponse {
  const markPx = Math.round(size * (maskable ? 0.56 : 0.72));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: NAVY,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          width={markPx}
          height={markPx}
          src={`data:image/svg+xml;utf8,${encodeURIComponent(MARK)}`}
          alt=""
        />
      </div>
    ),
    { width: size, height: size },
  );
}
