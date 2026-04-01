import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  headers: async () => [
    {
      // 静的アセット: 1年キャッシュ（immutable）
      source: '/_next/static/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
    {
      // 画像・フォント: 1ヶ月キャッシュ
      source: '/:path*.(png|jpg|jpeg|gif|svg|ico|woff|woff2)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=2592000, stale-while-revalidate=86400',
        },
      ],
    },
  ],
};

export default nextConfig;
