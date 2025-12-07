import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/snapdrop',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
