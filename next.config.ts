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
  webpack: (config, { webpack, isServer }) => {
    if (!isServer) {
      // Properly resolve both standard and `node:` prefixed core modules to false
      const fallbackRules = {
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
        assert: false,
        'fs/promises': false,
        'node:fs': false,
        'node:path': false,
        'node:crypto': false,
        'node:stream': false,
        'node:stream/promises': false,
        'node:os': false,
        'node:zlib': false,
        'node:tty': false,
        'node:child_process': false,
        'node:readline': false,
        'node:events': false,
        'node:assert': false,
        'node:fs/promises': false,
      };

      config.resolve.fallback = {
        ...config.resolve.fallback,
        ...fallbackRules,
      };

      config.resolve.alias = {
        ...config.resolve.alias,
        '@irys/upload': false,
        '@irys/upload-solana': false,
        ...fallbackRules,
      };

      // Ensure webpack ignores `node:` completely
      config.module.rules.push({
        test: /^node:/,
        use: 'null-loader',
      });
    }
    return config;
  },
};

export default nextConfig as any;
