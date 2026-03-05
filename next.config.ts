import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: process.env.NODE_ENV === 'production' ? '/snapdrop' : '',
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        'stream/promises': false,
        os: false,
        zlib: false,
        tty: false,
        child_process: false,
        readline: false,
        events: false,
        fs_promise: false,
        assert: false,
      };
      config.resolve.alias = {
        ...config.resolve.alias,
        '@irys/upload': false,
        '@irys/upload-solana': false,
        'stream/promises': false,
        'node:path': false,
        'node:fs': false,
        'node:crypto': false,
        'node:stream': false,
        'node:stream/promises': false,
        'node:os': false,
        'node:tty': false,
        'node:child_process': false,
        'node:readline': false,
        'node:events': false,
        'node:assert': false,
      };
    }
    return config;
  },
};

export default nextConfig as any;
