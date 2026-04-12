/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for Railway deployment
  output: 'standalone',

  // Allow images from any domain (Railway backend + uploads)
  images: {
    remotePatterns: [
      { protocol: 'http',  hostname: 'localhost' },
      { protocol: 'http',  hostname: '**'        },
      { protocol: 'https', hostname: '**'        },
    ],
  },

  // Proxy /api and /uploads to the Railway backend
  async rewrites() {
    const backend =
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:5000';
    console.log('[next.config] Backend URL:', backend);
    return [
      { source: '/api/:path*',     destination: `${backend}/api/:path*`     },
      { source: '/uploads/:path*', destination: `${backend}/uploads/:path*` },
    ];
  },
};

module.exports = nextConfig;
