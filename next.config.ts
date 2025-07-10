import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Client-side configuration
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        os: false,
        path: false,
        querystring: false,
        stream: false,
        crypto: false,
        http: false,
        https: false,
        net: false,
        tls: false,
        zlib: false
      };
    }
    return config;
  }
};

export default nextConfig;
