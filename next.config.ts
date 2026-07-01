import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 系統上層有多個 lockfile，Turbopack 會誤判 workspace root 導致 dev 找不到 tailwindcss。
  // 明確把 root 釘在本專案目錄。
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
