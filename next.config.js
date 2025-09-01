/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  env: {
    NEXT_PUBLIC_SPORTRADAR_API_KEY: process.env.NEXT_PUBLIC_SPORTRADAR_API_KEY,
    SPORTS_RADAR_API_KEY: process.env.SPORTS_RADAR_API_KEY,
    WEATHER_API_KEY: process.env.WEATHER_API_KEY,
    SPORTSDATAIO_API_KEY: process.env.SPORTSDATAIO_API_KEY
  }
};

module.exports = nextConfig;