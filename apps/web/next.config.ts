import type { NextConfig } from "next";

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
    ];
  },
};

export default nextConfig;
