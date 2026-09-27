import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Cursor Live desktop / computer-use browser to hit the dev server.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
