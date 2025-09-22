import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Do not block production builds on ESLint errors
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
