import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/apps/buzzyreader',
  images: {
    unoptimized: true, // Needed if not using Vercel's image optimization
  },
};

export default nextConfig;
