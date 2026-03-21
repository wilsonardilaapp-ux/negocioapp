/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude server-only packages from the client-side bundle
      config.externals.push(
        '@opentelemetry/instrumentation', 
        'firebase-admin',
        'require-in-the-middle'
      );
    }
    return config;
  },
};

export default nextConfig;
