
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    experimental: {
        // This option is used to exclude specific packages from the server-side bundle.
        // The current build error "Cannot find module ... @opentelemetry.js"
        // suggests a problem with how Next.js is bundling @opentelemetry/api, a
        // dependency of Genkit. By marking it as external, we tell Next.js to use
        // the version from node_modules directly at runtime on the server,
        // which bypasses the bundling issue.
        serverComponentsExternalPackages: ['@opentelemetry/api'],
    },
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
};

export default nextConfig;
