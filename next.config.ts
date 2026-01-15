import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Handle CommonJS modules on server side
      config.externals = config.externals || [];
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
  // Enable server components to use CommonJS modules
  serverExternalPackages: ['pdf-parse'],
};

export default nextConfig;
