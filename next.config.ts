import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hosts allowed to hit the Turbopack dev server (Cursor Live + Cloudflare tunnel).
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "due-addressing-tiny-increase.trycloudflare.com",
  ],
};

export default nextConfig;
