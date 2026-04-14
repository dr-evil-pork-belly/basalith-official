import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async redirects() {
    return [
      {
        source:      '/:path*',
        has:         [{ type: 'host', value: 'www.basalith.xyz' }],
        destination: 'https://basalith.xyz/:path*',
        permanent:   true,
      },
    ]
  },
};

export default nextConfig;
