import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.unionarena-tcg.com",
        pathname: "/na/images/**",
      },
    ],
  },
};

export default nextConfig;
