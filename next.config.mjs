/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['**/.playwright-mcp/**', '**/node_modules/**', '**/.next/**'],
      };
    }
    return config;
  },
};

export default nextConfig;
