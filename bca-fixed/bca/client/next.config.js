/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http',  hostname: 'localhost' },
      { protocol: 'http',  hostname: '**'        },
      { protocol: 'https', hostname: '**'        },
    ],
  },
  async rewrites() {
    const backend = process.env.NEXT_PUBLIC_API_URL || 'https://bca-auction.vercel.app';
    return [
      // Proxy API calls
      { source: '/api/:path*',     destination: `${backend}/api/:path*`     },
      // Proxy uploaded images — this is the fix for photos not showing
      { source: '/uploads/:path*', destination: `${backend}/uploads/:path*` },
    ];
  },
};

module.exports = nextConfig;
