/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/programs/:path*',
        destination: 'http://localhost:8899/:path*',
      },
    ];
  },
};

export default nextConfig;
