import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Handle node: protocol imports
    config.resolve.alias = {
      ...config.resolve.alias,
      'node:fs': 'fs',
      'node:os': 'os',
      'node:path': 'path',
      'node:querystring': 'querystring',
      'node:stream': 'stream'
    };

    return config;
  }
};

export default nextConfig;
