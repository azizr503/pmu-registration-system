/** @type {import('next').NextConfig} */
const nextConfig = {
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
