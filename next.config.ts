import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the dev server to be opened from a phone on the LAN or through a tunnel.
  // Without this, Next 16 blocks cross-origin dev requests, so client JS never
  // hydrates and client-only pages (e.g. /signup) render blank.
  allowedDevOrigins: [
    "*.trycloudflare.com",    // cloudflared tunnels
    "*.ngrok-free.app",       // ngrok tunnels
  ],
};

export default nextConfig;
