
/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: [
        'lucide-react', 
        'recharts', 
        'date-fns', 
        'embla-carousel-react', 
        'embla-carousel-autoplay',
        'react-quill',
        'quill',
        'firebase',
        '@firebase/app',
        '@firebase/auth',
        '@firebase/component',
        '@firebase/firestore',
        '@firebase/functions',
        '@firebase/storage',
        '@firebase/util'
    ],
    experimental: {
        serverComponentsExternalPackages: [
            '@opentelemetry/api', 
            '@opentelemetry/instrumentation', 
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
    webpack: (config, { isServer }) => {
        if (isServer) {
          config.externals.push('require-in-the-middle');
          config.externals.push('@opentelemetry/instrumentation');
          config.externals.push('@opentelemetry/api');
        }
        return config;
    },
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'res.cloudinary.com' },
            { protocol: 'https', hostname: 'picsum.photos' },
            { protocol: 'https', hostname: 'images.unsplash.com' },
            { protocol: 'https', hostname: 'seeklogo.com' },
            { protocol: 'https', hostname: 'via.placeholder.com' },
            { protocol: 'https', hostname: 'i.pravatar.cc' },
            { protocol: 'https', hostname: 'img.freepik.com' },
            { protocol: 'https', hostname: 'ing.freepik.com' },
            { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
            { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
            { protocol: 'https', hostname: 'storage.googleapis.com' },
        ],
    },
};

module.exports = nextConfig;
