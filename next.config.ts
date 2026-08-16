
import type { NextConfig } from 'next';

/**
 * Configuración maestra de Next.js.
 * Se eliminan configuraciones experimentales que causaban inestabilidad en los chunks.
 */
const nextConfig: NextConfig = {
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
            { protocol: 'https', hostname: 'res.cloudinary.com' },
            { protocol: 'https', hostname: 'picsum.photos' },
            { protocol: 'https', hostname: 'images.unsplash.com' },
            { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
        ],
    },
};

export default nextConfig;
