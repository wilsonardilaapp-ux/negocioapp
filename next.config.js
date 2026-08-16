
/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverComponentsExternalPackages: [
            'firebase-admin', 
            'cloudinary', 
            'pdf-parse',
            'genkit',
            '@genkit-ai/google-genai',
            '@genkit-ai/ai',
            '@genkit-ai/core',
            '@genkit-ai/flow',
            '@genkit-ai/dotprompt'
        ],
        serverActions: {
            bodySizeLimit: '50mb',
        },
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'res.cloudinary.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'picsum.photos',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'firebasestorage.googleapis.com',
                pathname: '/**',
            },
        ],
    },
};

module.exports = nextConfig;
