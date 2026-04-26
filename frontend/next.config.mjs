/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/__pmu_backend/:path*',
        destination: 'http://127.0.0.1:5001/:path*',
      },
    ]
  },
  serverExternalPackages: [],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { dev }) => {
    // Prevent PackFileCacheStrategy OOMs on low-memory machines (dev only).
    if (dev) {
      config.cache = false
    }
    return config
  },
}

export default nextConfig
