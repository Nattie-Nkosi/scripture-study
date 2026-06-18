"use client";

import * as React from "react";

// Catches errors thrown in the root layout. It replaces the whole document, so
// it can't rely on the app's theme/CSS — styles are inline + a scoped <style>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <style>{`
          .ge-wrap { min-height:100vh; display:flex; align-items:center; justify-content:center;
            padding:2rem; background:#f6f2e9; color:#2c2823;
            font-family: Georgia, 'Times New Roman', serif; }
          .ge-card { max-width:28rem; text-align:center; }
          .ge-h { font-size:1.5rem; font-weight:600; margin:0; letter-spacing:-0.01em; }
          .ge-p { margin:.5rem 0 0; color:#6f665a; font-size:.95rem;
            font-family: ui-sans-serif, system-ui, sans-serif; }
          .ge-btn { margin-top:1.5rem; padding:.55rem 1.1rem; border:none; border-radius:.6rem;
            background:#5a4632; color:#f6f2e9; font-size:.9rem; cursor:pointer;
            font-family: ui-sans-serif, system-ui, sans-serif; }
          .ge-btn:hover { background:#4a3a29; }
          .ge-code { margin-top:1.5rem; font-size:.72rem; color:#9a8f80;
            font-family: ui-monospace, monospace; }
          @media (prefers-color-scheme: dark) {
            .ge-wrap { background:#211d18; color:#ece6da; }
            .ge-p { color:#a89e8f; }
            .ge-btn { background:#d8c7ad; color:#211d18; }
            .ge-btn:hover { background:#c8b69a; }
            .ge-code { color:#7c7264; }
          }
        `}</style>
        <div className="ge-wrap">
          <div className="ge-card">
            <h1 className="ge-h">Something went wrong</h1>
            <p className="ge-p">
              A critical error occurred while loading the app. Please try again.
            </p>
            <button className="ge-btn" onClick={() => reset()}>
              Try again
            </button>
            {error?.digest && (
              <p className="ge-code">Reference code: {error.digest}</p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
