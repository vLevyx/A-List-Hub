/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react']
  },
  images: {
    domains: [
      'cdn.discordapp.com',
      'flagcdn.com',
      'api.battlemetrics.com',
      'icons.iconarchive.com'
    ],
    formats: ['image/webp', 'image/avif']
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  },

  // Add this block:
  webpack(config) {
    // Disable “Critical dependency: the request of a dependency is an expression”
    config.module.exprContextCritical = false

    return config
  },
}

module.exports = nextConfig