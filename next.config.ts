import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // /now was retired; old links land on the homepage
  async redirects() {
    return [{ source: "/now", destination: "/", permanent: true }];
  },
  // PostHog is reached through /ingest on this domain, so ad blockers leave it alone
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" },
    ];
  },
  // PostHog's API paths end in a slash; redirecting them would break the proxy
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
