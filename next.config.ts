import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Parent ~/package-lock.json otherwise makes Turbopack treat ~ as the app root.
  turbopack: {
    root: path.join(__dirname),
  },
  // Hosts allowed to hit the Turbopack dev server (Cursor Live + Cloudflare tunnel).
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "due-addressing-tiny-increase.trycloudflare.com",
  ],
};

export default nextConfig;
