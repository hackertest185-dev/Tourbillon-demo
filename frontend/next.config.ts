import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

const nextConfig = (phase: string): NextConfig => ({
  // Production builds must not overwrite the running development server's manifests.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
  output: 'standalone',
  transpilePackages: ['framer-motion'],
  allowedDevOrigins: ['*.ngrok-free.app', '*.ngrok-free.dev', '*.ngrok.io'],
  async redirects() {
    return [{ source: '/', destination: '/tourbillon', permanent: true }];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '*.cloudfront.net', pathname: '/**' },
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/*/image/upload/**' },
      { protocol: 'http', hostname: 'localhost', port: '5248', pathname: '/images/**' },
      { protocol: 'http', hostname: 'backend', port: '8080', pathname: '/images/**' },
    ],
    // Give the configured development API and production image distribution time to respond.
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
});

export default nextConfig;
