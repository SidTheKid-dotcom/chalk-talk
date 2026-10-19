import type { NextConfig } from 'next';
import os from 'node:os';

function lanOrigins(): string[] {
  const origins = ['127.0.0.1', 'localhost'];
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family === 'IPv4' && !addr.internal) {
        origins.push(addr.address);
      }
    }
  }
  const app = process.env.NEXT_PUBLIC_APP_URL;
  if (app) {
    try {
      origins.push(new URL(app).hostname);
    } catch {
      // ignore a malformed public URL; LAN hosts still work
    }
  }
  return origins;
}

const nextConfig: NextConfig = {
  allowedDevOrigins: lanOrigins(),
  devIndicators: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), display-capture=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
