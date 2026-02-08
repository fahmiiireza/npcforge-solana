import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/programs/:path*',
        destination: 'http://localhost:8899/:path*',
      },
    ]
  },
}

export default nextConfig
