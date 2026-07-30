import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/buzzyreader',
  images: {
    unoptimized: true, // Needed if not using Vercel's image optimization
  },
};

export default nextConfig;
