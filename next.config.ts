import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repo lives in a subfolder of the home directory; pin Turbopack's root
  // so it doesn't infer the parent workspace from an outer package-lock.json.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
