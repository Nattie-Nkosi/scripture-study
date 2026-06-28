import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The shared DB layer ships as TypeScript source; let Next compile it.
  transpilePackages: ["@gospel/db"],
};

export default nextConfig;
