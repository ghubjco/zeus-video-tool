/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    domains: ['www.tiktok.com', 'youtube.com', 'i.ytimg.com'],
    unoptimized: true
  }
}

module.exports = nextConfig