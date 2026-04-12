
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    experimental: {
        // This option is used to exclude specific packages from the server-side bundle.
        // The current build error "Cannot find module ... @opentelemetry.js" or "@firebase.js"
        // suggests a problem with how Next.js is bundling these dependencies of Genkit.
        // By marking them as external, we tell Next.js to use
        // the version from node_modules directly at runtime on the server,
        // which bypasses the bundling issue.
        serverComponentsExternalPackages: ['@opentelemetry/api', 'firebase-admin'],
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
            },
            {
                protocol: 'https',
                hostname: 'img.freepik.com',
            },
            {
                protocol: 'https',
                hostname: 'firebasestorage.googleapis.com',
            },
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
            },
            {
                protocol: 'https',
                hostname: 'storage.googleapis.com',
            },
        ],
    },
};

export default nextConfig;
