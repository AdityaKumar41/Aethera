/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@aethera/types', '@aethera/config'],
};

module.exports = nextConfig;
