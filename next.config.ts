import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.unionarena-tcg.com",
        pathname: "/na/images/**",
      },
      {
        protocol: "https",
        hostname: "www.unionarena-tcg.com",
        pathname: "/en/images/**",
      },
      {
        protocol: "https",
        hostname: "www.unionarena-tcg.com",
        pathname: "/jp/images/**",
      },
    ],
  },
};

export default nextConfig;
