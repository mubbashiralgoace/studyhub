import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable server components to use CommonJS modules
  serverExternalPackages: ['pdf-parse'],
};

export default nextConfig;
