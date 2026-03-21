/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'res.cloudinary.com',
            },
            {
                protocol: 'https',
                hostname: 'picsum.photos',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'seeklogo.com',
            },
            {
                protocol: 'https',
                hostname: 'via.placeholder.com',
            },
            {
                protocol: 'https',
                hostname: 'i.pravatar.cc',
            }
        ],
    },
    experimental: {
        serverComponentsExternalPackages: [
            '@genkit-ai/core',
            '@opentelemetry/instrumentation',
            '@opentelemetry/sdk-node',
            'require-in-the-middle',
            'firebase-admin',
        ],
    },
};

module.exports = nextConfig;
