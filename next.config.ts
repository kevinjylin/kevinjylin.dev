import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // /now was retired; old links land on the homepage
  async redirects() {
    return [{ source: "/now", destination: "/", permanent: true }];
  },
};

export default nextConfig;
