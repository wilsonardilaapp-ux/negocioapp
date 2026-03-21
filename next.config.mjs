// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@opentelemetry/instrumentation"],
  },
};

export default nextConfig;
