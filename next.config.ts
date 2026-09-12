import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXTPUBLICSUPABASEURL: process.env.NEXTPUBLICSUPABASEURL,
    NEXTPUBLICSUPABASEPUBLISHABLEKEY: process.env.NEXTPUBLICSUPABASEPUBLISHABLEKEY
  }
};

export default nextConfig;