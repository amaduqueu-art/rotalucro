/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // O lint roda separado via `npm run lint`; o build foca no typecheck.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
