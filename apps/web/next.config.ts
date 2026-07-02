import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// The client only ever talks to its own origin — Groq, Neon, and the scripture
// APIs are all called server-side — so the policy can stay tight. 'unsafe-inline'
// is required for now because next-themes injects an un-nonced inline script and
// the app uses inline styles; a nonce-based policy (via proxy) is the next step.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

// Always-safe headers apply everywhere; CSP + HSTS only in production so they
// don't interfere with dev (HMR websockets, eval-based tooling).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  ...(isProd
    ? [
        { key: "Content-Security-Policy", value: csp },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  // The shared DB layer ships as TypeScript source; let Next compile it.
  transpilePackages: ["@gospel/db"],
  // Transformers.js (and its onnx runtime) is loaded at runtime in the Node
  // assistant routes to embed the user's query — keep it out of the bundle.
  serverExternalPackages: ["@xenova/transformers"],
  async headers() {
    return [
      {
        // Never let the service worker itself get cached, so deploying a new
        // version reaches users instead of leaving them on a stale worker.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      { source: "/:path*", headers: securityHeaders },
    ];
  },
};

export default nextConfig;
