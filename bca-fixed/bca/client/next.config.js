/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',   // 🔥 VERY IMPORTANT FOR RAILWAY

  images: {
    remotePatterns: [
      { protocol: 'http',  hostname: 'localhost' },
      { protocol: 'http',  hostname: '**' },
      { protocol: 'https', hostname: '**' },
    ],
  },

  async rewrites() {
    const backend =
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.RAILWAY_BACKEND_URL ||
      'http://localhost:5000';

    return [
      {
        source: '/api/:path*',
        destination: `${backend}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backend}/uploads/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
