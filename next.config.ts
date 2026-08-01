import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  images: {
    unoptimized: true, // Needed if not using Vercel's image optimization
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
