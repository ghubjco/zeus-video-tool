/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['www.tiktok.com', 'youtube.com', 'i.ytimg.com'],
    unoptimized: true
  }
}

module.exports = nextConfig