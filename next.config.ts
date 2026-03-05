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
        'fs/promises': false,
        assert: false,
      };
      
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^node:/,
          (resource: any) => {
            resource.request = resource.request.replace(/^node:/, '');
          }
        )
      );

      config.resolve.alias = {
        ...config.resolve.alias,
        '@irys/upload': false,
        '@irys/upload-solana': false,
        'stream/promises': false,
        readline: false,
        fs: false,
        crypto: false,
        os: false,
        path: false,
        stream: false,
        tty: false,
        child_process: false,
        events: false,
        assert: false,
      };
    }
    return config;
  },
};

export default nextConfig as any;
