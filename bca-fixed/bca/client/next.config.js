/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '**' },
    ],
  },

  // ✅ Remove rewrites completely - not needed for Railway
  // API calls go directly to backend URL via NEXT_PUBLIC_API_URL
};

module.exports = nextConfig;
