import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "flagcdn.com" }] },
  async rewrites() {
    const endpoint = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    return [{ source: "/api/:path*", destination: `${endpoint}/api/:path*` }];
  }
};

export default nextConfig;
