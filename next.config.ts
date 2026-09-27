import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Cursor Live / desktop preview origins to hit the Turbopack dev server.
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "*.cursor.sh",
    "*.cursorapi.com",
    "*.cursor.com",
  ],
};

export default nextConfig;
