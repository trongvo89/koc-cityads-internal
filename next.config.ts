import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Serve the self-contained CityAds rate-card landing (public/ratecard.html)
    // at a clean, shareable URL without the .html extension.
    return [{ source: "/ratecard", destination: "/ratecard.html" }];
  },
};

export default nextConfig;
