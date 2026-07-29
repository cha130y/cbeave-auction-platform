import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  //permits next/image to optimize auction images returned by the API while rejecting images from unrelated external hosts
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;
